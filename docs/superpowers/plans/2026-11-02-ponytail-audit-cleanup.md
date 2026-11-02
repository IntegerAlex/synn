# Ponytail Audit Cleanup Implementation Plan

> **For agentic workers:** Implement all tasks directly in this session; do one whole-branch review at the end.

**Goal:** Apply the approved complexity cuts without changing app behavior.

**Architecture:** Delete unused code and configuration, consolidate repeated request handling and file-tree construction, and remove two redundant direct dependencies. Keep existing public `gitApi` methods and UI behavior unchanged.

**Tech Stack:** TypeScript, Next.js, Vitest, pnpm.

**Spec:** Approved findings from the ponytail-audit conversation.

## Global Constraints

- Do not touch the existing untracked `.github/` files in the original checkout.
- Add no dependencies.
- Keep current API behavior and response types.
- Use the existing Vitest suite; baseline: 50 tests pass.

## Review Focus

- Nested file trees retain folder-first alphabetical sorting and file payloads.
- Git API requests retain URL encoding, JSON bodies, headers, and response errors.
- Encryption callers continue encrypting with the embedded key and preserve their existing error handling.
- Removed env config and direct packages have no remaining source references.

---

### Task 1: Remove dead component and configuration

**Files:** Delete `src/components/diff/Breadcrumbs.tsx`; modify `src/lib/env.ts` and `.env.example`.

- [x] Remove the unreferenced diff breadcrumb component.
- [x] Remove `ENCRYPTION_PUBLIC_KEY_PATH` from the env schema and its commented example block.
- [x] Search for remaining references and run `pnpm test`.

### Task 2: Consolidate Git API request handling

**Files:** Modify `src/lib/api/client.ts`; add `src/__tests__/gitApi.test.ts`.

- [x] Add characterization coverage for a GET request and a JSON POST, including response parsing and errors.
- [x] Run the tests before refactoring to establish current behavior.
- [x] Add one private request helper for API base path, headers, fetch, and response handling; route existing methods through it.
- [x] Run the targeted test and full suite.

### Task 3: Share file-tree construction

**Files:** Add `src/lib/fileTree.ts` and `src/__tests__/fileTree.test.ts`; modify both file-tree components.

- [x] Write a failing test for nested paths, folder-first sorting, and leaf values; run it to confirm the missing helper fails.
- [x] Implement `buildFileTree<T>(items: T[], getPath: (item: T) => string)` returning sorted folder/file nodes with each leaf's original value.
- [x] Replace both local builders and verify the targeted test and full suite.

### Task 4: Remove constant availability checks

**Files:** Modify `src/lib/services/encryption.ts`, `src/lib/services/tokenEncryption.ts`, and `src/lib/services/activityLogger.ts`.

- [x] Remove `isEncryptionAvailable()` and its checks; retain current encryption try/catch behavior.
- [x] Search every caller and run `pnpm test` plus TypeScript checking.

### Task 5: Remove unused rate-limiter methods

**Files:** Modify `src/lib/rateLimit.ts`.

- [x] Remove unused `getStats()` and `stopCleanup()` methods and the stored interval handle; retain periodic cleanup.
- [x] Run `pnpm test` and TypeScript checking.

### Task 6: Drop redundant dependencies

**Files:** Modify `package.json` and `pnpm-lock.yaml`.

- [x] Remove `@types/dompurify` and direct `baseline-browser-mapping` entries.
- [x] Regenerate the lockfile with pnpm and run `pnpm test` and lint.
