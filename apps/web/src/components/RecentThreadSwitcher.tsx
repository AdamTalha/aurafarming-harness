import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { isShownUnderParent } from "@t3tools/client-runtime/state/threads";
import { AURAFARMING_FEATURES } from "@t3tools/shared/aurafarmingFeatures";
import { useRouter } from "@tanstack/react-router";
import { useGT } from "gt-react";
import { Code2Icon, CornerDownLeftIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { isCommandPaletteOpen } from "../commandPaletteBus";
import { useComposerDraftStore } from "../composerDraftStore";
import { useShownThreadRouteTarget } from "../hooks/useShownThreadRouteTarget";
import { resolveShortcutCommand, threadRecentDirectionFromCommand } from "../keybindings";
import { orderKeysByMru, recordThreadMruVisit } from "../lib/threadMruHistory";
import { cn } from "../lib/utils";
import { isModelPickerOpen } from "../modelPickerVisibility";
import { useDelegatedUnderParent, useProjects, useVisibleThreadShells } from "../state/entities";
import { primaryServerKeybindingsAtom } from "../state/server";
import { buildThreadRouteParams, resolveActiveThreadRouteRef } from "../threadRoutes";

const MAX_SWITCHER_ITEMS = 20;
const POINTER_MOVE_THRESHOLD_PX = 4;

interface SwitcherItem {
  readonly key: string;
  readonly thread: EnvironmentThreadShell;
  readonly projectName: string | null;
}

interface SwitcherState {
  readonly items: readonly SwitcherItem[];
  readonly selectedIndex: number;
}

function parseTimestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Primary sort: server-tracked `lastVisitedAt` (exact visit recency).
 * Secondary sort (for never-visited threads): latest user message / updated / created timestamp.
 */
function compareThreadsByRecency(a: EnvironmentThreadShell, b: EnvironmentThreadShell): number {
  const visitedDiff = parseTimestampMs(b.lastVisitedAt) - parseTimestampMs(a.lastVisitedAt);
  if (visitedDiff !== 0) return visitedDiff;

  const fallbackA =
    parseTimestampMs(a.latestUserAuthoredMessageAt) ||
    parseTimestampMs(a.latestUserMessageAt) ||
    parseTimestampMs(a.updatedAt) ||
    parseTimestampMs(a.createdAt);
  const fallbackB =
    parseTimestampMs(b.latestUserAuthoredMessageAt) ||
    parseTimestampMs(b.latestUserMessageAt) ||
    parseTimestampMs(b.updatedAt) ||
    parseTimestampMs(b.createdAt);
  return fallbackB - fallbackA;
}

function isDirectCtrlTabEvent(event: KeyboardEvent): "next" | "previous" | null {
  if (!event.ctrlKey || event.altKey || event.metaKey) return null;
  if (event.key !== "Tab" && event.code !== "Tab") return null;
  return event.shiftKey ? "previous" : "next";
}

function isKeybindingCaptureTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("[data-keybinding-capture]") !== null;
}

export function RecentThreadSwitcher() {
  const gt = useGT();
  const router = useRouter();
  const { shownTarget } = useShownThreadRouteTarget();
  const routeDraftThread = useComposerDraftStore((store) =>
    shownTarget?.kind === "draft" ? store.getDraftSession(shownTarget.draftId) : null,
  );
  const routeDraftRedirect = useComposerDraftStore((store) =>
    shownTarget?.kind === "draft" ? store.getPromotedDraftRedirect(shownTarget.draftId) : null,
  );
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const visibleThreads = useVisibleThreadShells();
  const delegatedUnderParent = useDelegatedUnderParent();
  const projects = useProjects();

  const [switcher, setSwitcher] = useState<SwitcherState | null>(null);
  const switcherRef = useRef<SwitcherState | null>(null);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const routeThreadRef = resolveActiveThreadRouteRef(
    shownTarget,
    routeDraftThread,
    routeDraftRedirect,
  );
  const routeThreadKey = routeThreadRef ? scopedThreadKey(routeThreadRef) : null;

  const projectNameByKey = new Map<string, string>();
  for (const project of projects) {
    projectNameByKey.set(`${project.environmentId}:${project.id}`, project.title);
  }

  const candidateThreads = visibleThreads.filter(
    (thread) =>
      thread.archivedAt === null &&
      thread.deletedAt === null &&
      thread.lineage.relationshipToParent !== "subagent" &&
      !isShownUnderParent(
        { environmentId: thread.environmentId, threadId: thread.id },
        thread.lineage,
        delegatedUnderParent,
      ),
  );

  const threadsByRecency = [...candidateThreads].toSorted(compareThreadsByRecency);
  const threadByKey = new Map<string, EnvironmentThreadShell>();
  const recencyKeys: string[] = [];
  for (const thread of threadsByRecency) {
    const key = scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id));
    threadByKey.set(key, thread);
    recencyKeys.push(key);
  }

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- records each navigated conversation into localStorage MRU history
  useEffect(() => {
    if (!AURAFARMING_FEATURES.mruThreadSwitcher) return;
    recordThreadMruVisit(routeThreadKey);
  }, [routeThreadKey]);

  const updateSwitcher = useEffectEvent((next: SwitcherState | null) => {
    if (next === null) {
      pointerOriginRef.current = null;
      pointerMovedRef.current = false;
    } else if (switcherRef.current === null) {
      // Fresh open: ignore stationary mouse resting over the list until pointer actually moves.
      pointerOriginRef.current = null;
      pointerMovedRef.current = false;
    }
    switcherRef.current = next;
    setSwitcher(next);
  });

  const commitSelection = useEffectEvent((item: SwitcherItem | undefined) => {
    updateSwitcher(null);
    if (!item) return;
    recordThreadMruVisit(item.key);
    if (routeThreadKey === item.key) return;
    const targetRef = scopeThreadRef(item.thread.environmentId, item.thread.id);
    void router.navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(targetRef),
    });
  });

  const cancelSwitcher = useEffectEvent(() => {
    updateSwitcher(null);
  });

  const buildItems = useEffectEvent((): SwitcherItem[] => {
    const orderedKeys = orderKeysByMru({
      currentKey: routeThreadKey,
      fallbackOrderedKeys: recencyKeys,
    }).slice(0, MAX_SWITCHER_ITEMS);

    const items: SwitcherItem[] = [];
    for (const key of orderedKeys) {
      const thread = threadByKey.get(key);
      if (!thread) continue;
      items.push({
        key,
        thread,
        projectName: projectNameByKey.get(`${thread.environmentId}:${thread.projectId}`) ?? null,
      });
    }
    return items;
  });

  const resolveDirection = useEffectEvent((event: KeyboardEvent): "next" | "previous" | null => {
    const command = resolveShortcutCommand(event, keybindings, {
      platform: navigator.platform,
    });
    const mapped = threadRecentDirectionFromCommand(command);
    if (mapped !== null) return mapped;
    // Direct fallback so Ctrl+Tab always works even before keybindings hydrate or on any layout.
    return isDirectCtrlTabEvent(event);
  });

  const onKeyDownCapture = useEffectEvent((event: KeyboardEvent) => {
    if (isKeybindingCaptureTarget(event.target)) return;

    const active = switcherRef.current;
    if (active !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelSwitcher();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        commitSelection(active.items[active.selectedIndex]);
        return;
      }
      const tabDirection = resolveDirection(event);
      if (tabDirection !== null) {
        event.preventDefault();
        event.stopPropagation();
        // Each Tab tap advances exactly 1 entry; ignore OS key-repeat bursts.
        if (event.repeat) return;
        const len = active.items.length;
        if (len === 0) return;
        const delta = tabDirection === "next" ? 1 : -1;
        updateSwitcher({
          items: active.items,
          selectedIndex: (active.selectedIndex + delta + len) % len,
        });
        return;
      }
      const arrowDirection =
        event.key === "ArrowDown" ? "next" : event.key === "ArrowUp" ? "previous" : null;
      if (arrowDirection !== null) {
        event.preventDefault();
        event.stopPropagation();
        const len = active.items.length;
        if (len === 0) return;
        const delta = arrowDirection === "next" ? 1 : -1;
        updateSwitcher({
          items: active.items,
          selectedIndex: (active.selectedIndex + delta + len) % len,
        });
      }
      return;
    }

    if (event.repeat || isCommandPaletteOpen() || isModelPickerOpen()) return;
    const direction = resolveDirection(event);
    if (direction === null) return;

    const items = buildItems();
    if (items.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    const initialIndex = items.length === 1 ? 0 : direction === "next" ? 1 : items.length - 1;
    updateSwitcher({
      items,
      selectedIndex: initialIndex,
    });
  });

  const onKeyUpCapture = useEffectEvent((event: KeyboardEvent) => {
    const active = switcherRef.current;
    if (active === null) return;
    if (event.key === "Control" || event.key === "Meta" || !event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      commitSelection(active.items[active.selectedIndex]);
    }
  });

  const onWindowBlur = useEffectEvent(() => {
    const active = switcherRef.current;
    if (active === null) return;
    commitSelection(active.items[active.selectedIndex]);
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- scrolls the highlighted MRU switcher item into view when cycling
  useEffect(() => {
    if (switcher === null) return;
    itemRefs.current[switcher.selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [switcher]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- attaches capture-phase window keyboard listeners for global Ctrl+Tab MRU switching
  useEffect(() => {
    if (!AURAFARMING_FEATURES.mruThreadSwitcher) return;
    const handleKeyDown = (event: KeyboardEvent) => onKeyDownCapture(event);
    const handleKeyUp = (event: KeyboardEvent) => onKeyUpCapture(event);
    const handleBlur = () => onWindowBlur();
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  if (switcher === null || switcher.items.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ paddingTop: "20vh" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          cancelSwitcher();
        }
      }}
    >
      <div
        role="listbox"
        aria-label={gt("Recent conversations")}
        className="w-full max-w-xl rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md"
      >
        <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
          {switcher.items.map((item, index) => {
            const isSelected = index === switcher.selectedIndex;
            const title = item.thread.title.trim() || gt("Untitled");
            return (
              <button
                key={item.key}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseMove={(event) => {
                  if (!pointerMovedRef.current) {
                    const origin = pointerOriginRef.current;
                    if (origin === null) {
                      pointerOriginRef.current = { x: event.clientX, y: event.clientY };
                      return;
                    }
                    if (
                      Math.abs(event.clientX - origin.x) < POINTER_MOVE_THRESHOLD_PX &&
                      Math.abs(event.clientY - origin.y) < POINTER_MOVE_THRESHOLD_PX
                    ) {
                      return;
                    }
                    pointerMovedRef.current = true;
                  }
                  if (switcherRef.current && switcherRef.current.selectedIndex !== index) {
                    updateSwitcher({
                      items: switcherRef.current.items,
                      selectedIndex: index,
                    });
                  }
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitSelection(item);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors",
                  isSelected
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <Code2Icon
                  className={cn(
                    "size-4 shrink-0",
                    isSelected ? "text-foreground/90" : "text-muted-foreground/75",
                  )}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                {isSelected ? (
                  <CornerDownLeftIcon className="size-4 shrink-0 text-muted-foreground" />
                ) : item.projectName ? (
                  <span className="max-w-36 shrink-0 truncate text-xs text-muted-foreground/60">
                    {item.projectName}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
