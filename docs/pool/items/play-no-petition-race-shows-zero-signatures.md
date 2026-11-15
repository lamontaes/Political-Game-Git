---
id: play-no-petition-race-shows-zero-signatures
title: 'A race that needs no signatures shows "Signatures the clerk will count: 0" at the counter and "0 of 0" on the Campaign tab'
area: play
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/p1-no-petition-no-signature-lines
pr: 9039
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P1, Nov 13
claimed-at: 2026-11-13
---

**What.** Richburg, South Carolina (bench seed a8ad5c79-cb5b-4616-b711-61b16eca1a9d, main 5e68cde1). The player files for the Richburg Town Council on August 19, 2025, a race whose law asks no signatures. The counter shows "SIGNATURES THE CLERK WILL COUNT: 0, HANDED IN BY AUGUST 21, 2025" right above "YOU ARE ON THE BALLOT". Politics → Campaign shows "Signatures 0 of 0, due August 21, 2025 / The clerk's count 0 counted, 0 struck" for the rest of the race.
Seen: the filing counter's labels and the Campaign tab's rows for a race with no petition.

**Cause.** Found in code: src/core2/modules/voting.ts `openFilingPetition` opens a petition of none for a race whose law asks no signatures and checks it at once (by design, so the filing goes on the ballot through one path). src/bench/play.mjs shows a petition whenever one exists: the counter's label (`value.result?.petition`) and the campaign board's rows (`petition ? …`), so a petition of none is shown as 0.

**Fix.** Show the counter's petition label and the campaign board's signature rows only for a petition that needs signatures (`petition.needed > 0`). src/bench/filing.browser.mjs checks that a filing put straight on the ballot shows no "will count: 0". The Journal's line for such a petition ("came back with 0 good signatures, against 0") is the Words session's to drop.

**Time box.** 1 hour for one Sonnet session.

**Rules.** player-screen-text: no screen shows a count of nothing as if it were a record. One rule, all 56 places: the screens read the petition's own count, with no place named.

**Done when.** A second session, on main, starts new lives in a drawn place each until a race files with no signatures, files for it, and takes a screenshot of the counter and the Campaign tab. Neither shows a petition, and a race with a petition still shows its count and due date.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/filing.browser.mjs, src/core2/modules/voting.ts
