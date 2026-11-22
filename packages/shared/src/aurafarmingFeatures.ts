/**
 * Central branding and feature flags for Aurafarming Harness (custom fork of T3 Code).
 * Keep modifications isolated behind these flags so `git rebase upstream/main` stays clean.
 */

export const AURAFARMING_BRAND = {
  baseName: "AuraFarming",
  displayName: "AuraFarming",
  shortName: "AuraFarming",
  subtitle: "",
  appUserModelId: "com.aurafarming.app",
} as const;

export const AURAFARMING_FEATURES = {
  /** Git branch picker, git status actions, commit/push controls */
  git: false,
  /** Diff panel and diff settings */
  diffs: false,
  /** Git worktree creation, switcher, settings, and MCP tools */
  worktrees: false,
  /** Pull requests list, tabs, dialogs, review guides, and MCP tools */
  pullRequests: false,
  /** Issue trackers list, tabs, and MCP tools */
  issues: false,
  /** iOS Simulator / Android Emulator panel, settings, and MCP tools */
  devices: false,
  /** Scheduled tasks, webhooks, settings, and MCP tools */
  scheduledTasks: false,
  /** Integrated browser preview (kept enabled) */
  preview: true,
  /** Ctrl+Tab MRU (Most Recently Used) session switcher */
  mruThreadSwitcher: true,
  /** Disable upstream T3 Code auto-updater so custom builds are never overwritten */
  autoUpdater: false,
  /** Disable Antigravity CLI telemetry (`agy acp --disable-telemetry`) */
  antigravityDisableTelemetry: true,
  /** Disable Antigravity built-in default skills (`--include-default-customizations=false`) while keeping user skills & hooks */
  antigravityIncludeDefaultCustomizations: false,
} as const;

export const DISABLED_SETTINGS_PATHS: ReadonlySet<string> = new Set([
  ...(!AURAFARMING_FEATURES.diffs && !AURAFARMING_FEATURES.pullRequests ? ["/settings/diffs"] : []),
  ...(!AURAFARMING_FEATURES.devices ? ["/settings/devices"] : []),
  ...(!AURAFARMING_FEATURES.scheduledTasks ? ["/settings/scheduled-tasks"] : []),
  ...(!AURAFARMING_FEATURES.git &&
  !AURAFARMING_FEATURES.pullRequests &&
  !AURAFARMING_FEATURES.issues
    ? ["/settings/source-control"]
    : []),
  ...(!AURAFARMING_FEATURES.worktrees ? ["/settings/worktrees"] : []),
]);
