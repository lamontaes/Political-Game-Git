---
id: release-pool-words-speech-voices-malformed
title: "words-speech-voices is a priority-2 item the pool check rejects: Done when and Files are too thin"
area: release
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/pool-words-speech-voices
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:08:02.818Z
---

**What.** `npm run pool -- add` wrote a body of TODO for every item, so any priority 1 or 2 item added this way failed the pool check on main until someone filled it in; words-speech-voices was one, and thirteen more fail now. The fix is at the root: `add` takes the body on the command line and refuses a priority 1 or 2 item whose body does not pass the same quality gate, before anything is written or pushed to main. Priority 3 items may still start as TODO.

**Rules.** Replace, never layer: the TODO template for priority 1 and 2 is replaced by the gate, not wrapped by a second checker. Local gate: the pool check and the changed-file tests stay the only checks, and the change adds none.

**Done when.** `npm run pool -- add <id> --priority 2` with no body exits with the quality problems and writes no file, one with a full body is accepted, and the new test in scripts/pool/index.test.ts passes alongside the existing pool tests.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts, docs/pool/README.md

**Notes.** words-speech-voices itself was repaired by another session before this item was built. The thirteen items still failing the check at this commit are listed by `npm run pool -- --check`; each owner session should fill its own.
