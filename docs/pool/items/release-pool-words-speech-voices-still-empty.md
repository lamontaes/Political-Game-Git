---
id: release-pool-words-speech-voices-still-empty
title: "Write the real speech-voices specification; in-pr status hides its TODO sections"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/speech-voices-spec
pr: #5765
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T23:37:15.794Z
---

**What.** PR 5763 filled the malformed repair item itself, but docs/pool/items/words-speech-voices.md still contains TODO in What, Rules, Done when and Files. Its normal in-pr status hides those failures from the ordinary pool output. Forced-open quality reports all four errors, so the actual Words feature still lacks a written specification even though the repair-item shell now passes. Write the real feature specification from its existing title and PR 5196 without reducing the implementation or proof scope.

**Rules.** Replace, never layer: rewrite the TODO sections in the existing Words feature item and keep exactly one of each section. Preserve the unfinished Words implementation and its current PR metadata; writing a specification never marks the feature itself done.

**Done when.** The words-speech-voices item has a valid written What, Rules, Done when and Files matching the existing feature and PR 5196, with no duplicate sections. Calling the scripts/pool/index.ts quality function with its status forced to open returns no errors, and the PR body includes that check output. The Words implementation remains unfinished until its own acceptance is demonstrated.

**Files.** docs/pool/items/words-speech-voices.md, scripts/pool/index.ts

**Notes.** Found during PR 5763 review: the normal pool check printed no words-speech-voices line, but forced-open quality produced four TODO-related errors. The finalizer mistakenly continued after that extra check failed; its PR body and single merge comment were corrected. PR 5763 repairs release-pool-words-speech-voices-malformed, while this item tracks the actual Words specification still missing.
