/**
 * Tracks Most Recently Used (MRU) conversation keys for the Ctrl+Tab switcher.
 *
 * Persisted in localStorage so the recent visit order survives app restarts.
 */

const STORAGE_KEY = "aurafarming:thread-mru:v1";
const MAX_MRU_ENTRIES = 128;

let mruStack: string[] = loadInitialStack();

function loadInitialStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mruStack));
  } catch {
    // Ignore storage quota or sandbox errors.
  }
}

/** Promotes a visited conversation key to the front of the MRU stack. */
export function recordThreadMruVisit(threadKey: string | null): void {
  if (!threadKey) return;
  if (mruStack[0] === threadKey) return;
  mruStack = [threadKey, ...mruStack.filter((entry) => entry !== threadKey)].slice(
    0,
    MAX_MRU_ENTRIES,
  );
  persistStack();
}

/**
 * Returns keys ordered from most recently used to least recently used:
 * 1. `currentKey` (if valid) at index 0
 * 2. Previously visited keys from the local MRU stack
 * 3. Remaining keys in `fallbackOrderedKeys` (sorted by server recency)
 */
export function orderKeysByMru(input: {
  readonly currentKey: string | null;
  readonly fallbackOrderedKeys: readonly string[];
}): string[] {
  const validSet = new Set(input.fallbackOrderedKeys);
  if (validSet.size === 0) return [];

  const ordered: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (key: string | null | undefined) => {
    if (!key || seen.has(key) || !validSet.has(key)) return;
    seen.add(key);
    ordered.push(key);
  };

  pushUnique(input.currentKey);
  for (const key of mruStack) pushUnique(key);
  for (const key of input.fallbackOrderedKeys) pushUnique(key);

  return ordered;
}
