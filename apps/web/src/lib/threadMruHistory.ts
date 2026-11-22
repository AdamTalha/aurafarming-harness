/**
 * Tracks Most Recently Used (MRU) thread/draft row keys for Ctrl+Tab switching.
 *
 * Behavior matches VS Code / Alt+Tab:
 * - Quick tap Ctrl+Tab switches to the most recently used session (A <-> B ping-pong).
 * - Holding Ctrl and tapping Tab repeatedly walks deeper down the MRU stack without
 *   mutating order until Ctrl is released (or the window blurs), at which point the
 *   landed session is promoted to the front of the MRU stack.
 */

const STORAGE_KEY = "aurafarming:thread-mru:v1";
const MAX_MRU_ENTRIES = 64;

let mruStack: string[] = loadInitialStack();
let activeCycleSnapshot: string[] | null = null;
let activeCycleIndex = 0;

function loadInitialStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function persistStack(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mruStack));
  } catch {
    // Ignore storage quota or sandbox errors.
  }
}

function promoteKey(rowKey: string): void {
  if (mruStack[0] === rowKey) return;
  mruStack = [rowKey, ...mruStack.filter((entry) => entry !== rowKey)].slice(0, MAX_MRU_ENTRIES);
  persistStack();
}

export function isMruCycleActive(): boolean {
  return activeCycleSnapshot !== null;
}

/** Records a normal visit to a thread/draft route. Ignored while Ctrl+Tab cycling is mid-flight. */
export function recordThreadMruVisit(rowKey: string | null): void {
  if (!rowKey || activeCycleSnapshot !== null) return;
  promoteKey(rowKey);
}

/** Commits the current Ctrl+Tab cycle target to the front of the MRU list. */
export function commitThreadMruCycle(currentRowKey: string | null): void {
  if (activeCycleSnapshot === null) return;
  const landed = activeCycleSnapshot[activeCycleIndex] ?? currentRowKey;
  activeCycleSnapshot = null;
  activeCycleIndex = 0;
  if (landed) {
    promoteKey(landed);
  }
}

/**
 * Steps through the MRU session list on Ctrl+Tab (`next`) or Ctrl+Shift+Tab (`previous`).
 * Returns the target rowKey to navigate to, or null if no other session exists.
 */
export function stepThreadMruCycle(input: {
  readonly direction: "next" | "previous";
  readonly currentRowKey: string | null;
  readonly orderedRowKeys: readonly string[];
}): string | null {
  const validSet = new Set(input.orderedRowKeys);
  if (validSet.size === 0) return null;

  if (activeCycleSnapshot === null) {
    const snapshot: string[] = [];
    const seen = new Set<string>();
    const pushUnique = (key: string | null | undefined) => {
      if (!key || seen.has(key) || !validSet.has(key)) return;
      seen.add(key);
      snapshot.push(key);
    };

    // Start with the currently visible session at index 0, then previously visited sessions,
    // then fall back to remaining sidebar sessions so Ctrl+Tab works even on a fresh launch.
    pushUnique(input.currentRowKey);
    for (const key of mruStack) pushUnique(key);
    for (const key of input.orderedRowKeys) pushUnique(key);

    if (snapshot.length < 2) return null;
    activeCycleSnapshot = snapshot;
    activeCycleIndex = 0;
  }

  const len = activeCycleSnapshot.length;
  if (len < 2) return null;

  const delta = input.direction === "next" ? 1 : -1;
  activeCycleIndex = (activeCycleIndex + delta + len) % len;
  return activeCycleSnapshot[activeCycleIndex] ?? null;
}
