# Template Sync Guide

How to keep existing projects aligned with updates to the mobile template (`native-herouiv3-template`) and the backend monolith (`tanstack-start-monolith-template`).

---

## The Problem

When the template is updated — new architecture patterns, security fixes, new screens, refactored data layer — existing projects built from it become outdated. You can't just pull from the template repo because the projects have their own features on top of it.

This guide defines how to handle that without breaking existing projects.

---

## Mental Model

Think of the template as having two layers:

```
┌─────────────────────────────────┐
│         YOUR APP CODE           │  ← features, screens, business logic
├─────────────────────────────────┤
│       TEMPLATE FOUNDATION       │  ← auth, logger, store, query config,
│                                 │     system screens, security, realtime
└─────────────────────────────────┘
```

Template updates only touch the **foundation layer**. Your app code lives above it. A sync means bringing the foundation layer up to date without touching your app code.

The problem is that over time these layers blur — you modify foundation files to add app-specific behavior, and template updates touch those same files.

---

## Template Update Categories

Every template change falls into one of four categories. The category determines how you sync it.

### Category 1 — New File (Additive)
A new file that doesn't exist in your project yet.

```
Example: src/lib/security/root-detection.ts added in MVP 6
```

**Action:** Copy the file directly. No conflict possible.

---

### Category 2 — Config Change (Low Risk)
A change to a config file or registry that your project also uses but likely hasn't modified deeply.

```
Examples:
- src/lib/query/config.ts — new STALE tier added
- src/lib/query/keys.ts — new key factory added
- src/navigation/tabs.config.ts — new role added
- babel.config.js — new plugin added
```

**Action:** Manually merge. Open both files side by side. Copy the new addition without overwriting your existing entries.

---

### Category 3 — Foundation File Modified (Medium Risk)
A file that exists in your project and the template both modified.

```
Examples:
- app/_layout.tsx — new boot sequence step added
- src/store/slices/ui.slice.ts — new field added
- src/lib/secure-store/index.ts — new method added
- src/features/auth/adapter.ts — new method on interface
```

**Action:** Diff-based merge. Use the changelog (see below) to understand exactly what changed. Apply only the delta, not the whole file.

---

### Category 4 — Breaking Change (High Risk)
A pattern or convention that changed fundamentally. Existing code using the old pattern still works but is now inconsistent with the template.

```
Examples:
- Auth adapter interface changed (new required method added)
- Query key format changed
- Logger API changed
- Store slice renamed or restructured
```

**Action:** Tracked in BREAKING_CHANGES.md (see below). Requires intentional migration per project. Can be deferred — old pattern still works until you choose to migrate.

---

## Files You Should Never Modify in Your Project

These are pure foundation files. If you need custom behavior, extend them — don't edit them directly. That way template updates apply cleanly.

```
src/lib/logger/logger.ts              ← extend via transports only
src/lib/logger/transports/remote.ts   ← plug in your service, don't change interface
src/lib/secure-store/index.ts         ← extend with new keys, don't change existing methods
src/lib/query/config.ts               ← add new STALE tiers, don't rename existing
src/lib/security/root-detection.ts    ← consume the hook, don't modify it
src/lib/security/deep-link-validator.ts ← extend allowlist, don't change validator logic
```

If you find yourself editing these files for app-specific reasons — that's a signal to extend via a wrapper or new file instead.

---

## Files You Will Always Modify Per Project

These are expected to differ between projects. Template updates to these files are advisory — you read the change and decide what to apply.

```
app/(app)/_layout.tsx                 ← your tab config will differ
app/(app)/index.tsx                   ← your home screen content
src/navigation/tabs.config.ts         ← your roles and tabs
src/lib/query/keys.ts                 ← your feature query keys
.env                                  ← your URLs and secrets
app.json                              ← your app name, package, scheme
```

---

## How to Track What Changed in the Template

### Template Changelog

Every meaningful template update should be committed to the template repo with a structured commit message:

```
[MVP-X] short description

Category: 1|2|3|4
Files changed: path/to/file.ts, path/to/other.ts
Breaking: yes|no
Migration: what existing projects need to do
```

Example:
```
[MVP-6] Add root detection and deep link validation

Category: 1 (new files)
Files changed: src/lib/security/root-detection.ts, src/lib/security/deep-link-validator.ts
Breaking: no
Migration: Call useRootDetection() in app/_layout.tsx. Add validateDeepLink() in (auth)/_layout.tsx.
```

### BREAKING_CHANGES.md in Template Repo

A running log of Category 4 changes:

```md
## v2.0.0 — Auth Adapter Interface Change
Date: YYYY-MM-DD
File: src/features/auth/adapter.ts
Change: Added required method refresh() to AuthAdapter interface
Migration: Implement refresh() in both better-auth.adapter.ts and custom.adapter.ts
          If you don't use token refresh, return a no-op that throws 'Not implemented'
Affects: All projects on v1.x
```

---

## Sync Process Per Project

When the template releases an update, follow this process for each existing project:

### Step 1 — Read the changelog

Check the template repo commits since your project was last synced. Identify all changed files and their categories.

### Step 2 — Categorize your exposure

For each changed file, ask: **did your project also modify this file?**

```
Template changed: src/lib/query/config.ts
Your project:     modified? yes/no

If no  → copy directly (Category 1 behavior)
If yes → diff and merge manually
```

### Step 3 — Apply in order

Apply Category 1 first (safest), then 2, then 3, then 4 last.

Never apply a Category 4 change in the middle of a sprint. Schedule it as a dedicated task.

### Step 4 — Run the acceptance criteria

Each MVP spec has acceptance_criteria. After syncing, run through them manually or with your test suite to verify nothing regressed.

### Step 5 — Update your project's sync marker

Keep a file in your project root called `.template-sync` with the last synced template commit hash:

```
# .template-sync
mobile-template: abc1234
backend-template: def5678
last-synced: 2025-06-01
```

This tells you exactly where you are relative to the template at any point.

---

## Handling Deprecated Approaches

When the template deprecates a pattern (e.g. moved from direct SecureStore calls to the wrapper), your existing project keeps working — the old pattern isn't removed from your codebase automatically.

Handle deprecations like this:

**Don't migrate immediately** — only migrate a deprecated pattern when you're already touching that file for a feature change. Don't do a pure migration pass unless it's a security fix.

**Mark it** — add a comment so you know it's pending:

```ts
// TEMPLATE-DEPRECATED: use secureStore wrapper instead of direct SecureStore
// Migrate when next touching this file
import * as SecureStore from 'expo-secure-store'
```

**Treat security-related deprecations differently** — if the deprecated pattern is a security issue (e.g. direct SecureStore calls without error handling, console.log in production), migrate immediately regardless of sprint.

---

## New Project Checklist (Cloning the Template)

When starting a new project from the template:

```
□ Clone the template repo
□ Run through SECURITY_CHECKLIST.md before writing any feature code
□ Update app.json — name, slug, package (Android), bundle ID (iOS)
□ Update .env — API URL, Pusher keys
□ Update src/navigation/tabs.config.ts — your roles and tabs
□ Update app/(app)/index.tsx — replace placeholder home screen
□ Update app/(auth)/sign-in.tsx — replace logo and app name
□ Set initial .template-sync commit hash
□ Delete the dev ping card in sign-in.tsx if not needed (__DEV__ guards it but clean it up)
□ Replace placeholder onboarding slides in MVP 3 with your app's value props
```

---

## When the Backend Template Updates

Same process applies for `tanstack-start-monolith-template`. The mobile adapter pattern insulates you from most backend changes — if the adapter interface doesn't change, mobile code doesn't need to change even if backend endpoints move.

The only backend changes that force mobile updates:

```
1. AuthAdapter interface method added or removed
2. Response shape of /api/auth/get-session changes (user fields added/removed)
3. tRPC procedure renamed or removed
4. /api/app/config response shape changes
```

Everything else is internal to the backend and the adapter absorbs it.

---

## Summary

| Situation | Action |
|-----------|--------|
| New file in template | Copy directly |
| Config addition | Merge manually |
| Foundation file updated | Diff and apply delta only |
| Breaking change | Read BREAKING_CHANGES.md, schedule migration |
| Deprecated pattern in your project | Mark with comment, migrate on next touch |
| Security-related deprecation | Migrate immediately |
| New project from template | Follow new project checklist |
| Check sync status | Read `.template-sync` file |
