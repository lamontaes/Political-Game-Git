---
id: core-stopgap-main-player-text-gap
title: "Stopgaps in main (player-text-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
standard: 2
claimed-by:
pr: #5251
after:
blocked-on:
milestone:
model: sonnet
effort: medium
root: rc4-hand-written-words
lead: words
source: "src/core2/data/stopgaps.json, desktop/main.mjs, kind player-text-gap"
claimed-at:
size: S
checked: fable 2026-11-10
---

**What.** The desktop shell's update dialogs (Check for Updates, and the Mac note on what installing does) are written in the shell, not by the English engine (row SG-PLAY-desktop-update-dialog-text in src/core2/data/stopgaps/play.json). The text is one sentence in desktop/main.mjs (`installNote`, line 210: "When you quit, the new version replaces this one in the same folder and opens. Your saves stay where they are."), a dialog the owner ordered on Oct 14. PR #5251 moved 19 authored dialog lines into a bank and was held, because authored text ships only after grading and the shell cannot read graded parts. Either the English engine's graded parts feed the shell with one graded fallback per dialog, or the owner accepts the shell string.

**Cause.** Found in code: desktop/main.mjs line 210 (`installNote`) holds the Mac update note written in the shell, not by the English engine (row SG-PLAY-desktop-update-dialog-text in src/core2/data/stopgaps/play.json); the shell cannot read graded bank parts, and PR #5251's 19 authored shell.json entries were held because authored text ships only after grading.

**Fix.** Words (Story) writes the update dialog lines as bank pieces; the shell reads only graded or shippable parts and gets one graded fallback per dialog; if the owner prefers, register an owner-decision stopgap to accept the shell string, and build the simplest version meanwhile.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: words come from the English engine's banks (scene-standard), and authored pieces ship only after the owner's grades (words-engine). Owner decisions are flagged, never waited on: build the simplest version, register the owner-decision stopgap and write the question under OWNER DECISIONS NEEDED. Replace, never layer: the shell string is deleted when the banked line replaces it.

**Done when.** A second session, not the builder, runs the packaged desktop shell (or its update-dialog test) on a drawn place's game and sees the update dialogs read from graded bank parts, or, if the owner accepts the shell string, sees SG-PLAY-desktop-update-dialog-text resolved as accepted with the ruling cited. No authored line ships ungraded.

**Waits on.** Nothing.

**Files.** desktop/main.mjs, src/core2/data/stopgaps/play.json

**Notes.** First row: The desktop shell's update dialogs (Check for Updates, and the Mac note on what installing does) are written in the shell, not by the English engine.

Looked at Oct 19 (claude/stopgap-rows-notes), not built. The row is one sentence in `desktop/main.mjs` (`installNote`, shown on a Mac update: "When you quit, the new version replaces this one in the same folder and opens. Your saves stay where they are."), a dialog the owner ordered on Oct 14. Replacing it means shipping an English-engine bank beside the client for the shell to read, which has to be built and checked in the packaged Electron app; this container cannot run it. The owner may prefer to close the row as an accepted shell string; that is his call, so I did not guess.

Sent back 2026-10-20 from PR #5251 (branch claude/desktop-update-text): data/english/parts/shell.json adds 19 entries with origin authored and shippable true. The morning check forbids authored bank text shipping before grading. Keep these entries held until graded, update the claimed shipped behavior accordingly, and have the Words session own the data/english changes.; finish on that branch, merge main into it first.

Oct 21 (claude): not finished; this needs the Words session and an owner call. PR #5251 moves the desktop updater's dialog text into `data/english/parts/shell.json` (19 authored entries, `shippable: true`), and the morning check forbids authored pieces shipping before grading. The catch: the shell runs outside the game and reads the bank itself (`desktop/shell-lines.mjs` ignores `shippable` and throws on a missing line), so setting the pieces to `shippable: false` changes nothing the user sees, and removing them would make the updater throw. Either the owner grades these 19 lines in a batch (then the PR ships as is), or the shell is told to read only graded parts and given one graded fallback per dialog. Merging main into the branch conflicts only in `scripts/english-corpus/moves.json` (keep both `shell` and main's entries). Claim released.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): the stopgap row it tracks, SG-PLAY-desktop-update-dialog-text in src/core2/data/stopgaps/play.json, was resolved on Nov 10 ("too in depth, owner: the estimate stays as the game's answer", stopgap-triage-play). Its `data/english/parts/shell.json` never reached main (it lived only on closed PR #5251) and the single stopgaps file the item's source line names no longer exists (the rows now live in one file per family). The one shell sentence stays in desktop/main.mjs by that ruling.
