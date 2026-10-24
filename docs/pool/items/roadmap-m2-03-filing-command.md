---
id: roadmap-m2-03-filing-command
title: "Roadmap M2-03 has no command: a check that files in person at the drawn place's real office, as the play screen does"
area: elections
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M2-03, filing in person, reads passes: false with command null on main, so it can never pass. The play screen files through the bench's own calls: the Travel sheet opens the filing office's visit (openBenchFilingVisit), the player names an office and the clerk answers from its records, the overlay shows the rules, platform and party, and Filing files once (chooseAtCounter). A headless check on those calls, in the runner's drawn place, can prove the spec without a browser in CI.

**Rules.** Wire to the world: the check plays buildBenchWorld in a place drawn from all 56 and files through the same calls the screen makes. No hand-written player text: every line said at the counter comes from the English engine's records. Never edit a spec's test text.

**Done when.** docs/roadmap/features.json has a command for M2-03 that, in the runner's drawn place, shows a 17-year-old player told the rule that stops them with no way to file, then the same player at 18 filing once with a platform at the place's real filing office, on the ballot by record id, and a second filing refused; run on main with place and seed in the PR body, and failing when filing puts no one on the ballot.

**Files.** src/bench/m2-03-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m2-filing-races-flags (CTO branch).
