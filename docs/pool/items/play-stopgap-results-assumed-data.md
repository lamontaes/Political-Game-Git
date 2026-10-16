---
id: play-stopgap-results-assumed-data
title: "Stopgaps in results (assumed-data): 1 open"
area: play
kind: stopgap
priority: 3
status: done
claimed-by:
pr: #4779
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/results.ts, kind assumed-data"
claimed-at:
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/bench/results.ts: SG-PLAY-challenger-name. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/results.ts

**Notes.** First row: Election night names a drawn challenger by repeating the voting module’s private identity draw (same seed, seat key and role).

Sent back 2026-10-16 from PR #4779 (branch claude/results-challenger-name): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
