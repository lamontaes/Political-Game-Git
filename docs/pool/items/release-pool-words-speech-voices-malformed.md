---
id: release-pool-words-speech-voices-malformed
title: "words-speech-voices is a priority-2 item the pool check rejects: Done when and Files are too thin"
area: release
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/political-game-pool-7xkkii
pr: #5196
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:38:09.932Z
---

**What.** The pool check rejects words-speech-voices, a priority 2 item whose What, Rules, Done when and Files were all the word TODO. That item was added from the command line without a body, so it failed the length and content rules a priority 1 or 2 item must meet. Write its body from the code that exists (the worded speech parts), so the item says what to build and how it will be checked, and the check passes again.

**Rules.** Replace, never layer: the stub text is replaced by the real body in the same change, with nothing left beside it. Look before you ask: the body is written from the register cards and the speech engine already in the repository, not from a question to the owner.

**Done when.** Running npm run pool -- --check lists no problem for words-speech-voices or for this item, and the item file for words-speech-voices has a What of three sentences, a Rules line naming standing rules, a Done when that names buildBenchWorld and a drawn place, and a Files line with paths. The test is that command run in a clean checkout.

**Files.** docs/pool/items/words-speech-voices.md, docs/pool/items/release-pool-words-speech-voices-malformed.md

**Notes.** Found by the pool check on Oct 20. The same defect (a stub body on a priority 1 or 2 item) is on other items; this one is the only one named here.
