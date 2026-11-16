---
id: dev-mode-why-a-voter-leans
title: "Dev mode cannot show why a voter leans as they do: the views row races read and each race's appeal are not on any screen"
area: play
kind: feature
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-hjvzia-voter-lean
pr:
after:
blocked-on:
root: none
lead: fable
model: opus
effort: medium
source: owner, Nov 16 00:59Z (every trace in dev mode); views thread
---

**What.** A tester cannot see in dev mode why a person leans as they do or whom they would vote for. Trace on a person lists their stances and past shifts, and the person panel lists their views rows, but neither shows the views engine's own row (lean, label, the survey cell it formed from, faith and degree against the age band), the lean every race reads, or each candidate's appeal to them on the next election day. Seen: dev mode's person card in a played town, where the views row is left out because it is keyed by id, not personId.

**Cause.** Found in code: `DevMode.person` in src/bench/dev-mode.ts filters every views table by `row.personId`, and the views engine's people row (`viewOf`, src/core2/modules/views.ts) has only `id`, so it never shows; the races read `voterLean` and `doorAppealOf` (src/core2/modules/voting.ts), and no dev route calls either.

**Fix.** A view in its own file, src/bench/dev-views/voter-lean.ts, registered through the one point (src/bench/dev-views.ts): GET voter-lean returns the lean races read (`voterLean`) and where it comes from, the views row, the party tie (`partyTie`), the stances with their causes, and for each race on the next election day the ballot (`ballot`), each candidate's appeal parts (`doorAppealOf`) and the first choice (`countedChoice`). Its page part, src/bench/ui/voter-lean.mjs, draws on the person card in dev mode in a new slot "person"; every id opens in Trace. Nothing is computed in the view; each figure is the engine's own reader.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** Ask why: a tester reads each voter's lean and choice from the records the races read, by record id.

**Done when.** A second session opens a person's card in dev mode in a drawn place and finds "Why they lean" with the lean races read, the views row and, once filing has closed, each race's appeal with the first choice; the test src/bench/dev-views/voter-lean.test.ts passes at its pinned place.

**Waits on.** PR #9619 (the one registration point).

**Files.** src/bench/dev-views/voter-lean.ts (new), src/bench/dev-views/voter-lean.test.ts (new), src/bench/ui/voter-lean.mjs (new), src/bench/ui/dev-views.mjs, src/bench/play.mjs
