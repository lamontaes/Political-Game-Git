---
id: laws-wiring-every-law
title: "Every law wired on all nine links, with a checker and matrix"
area: laws
kind: wiring
priority: 1
size: L
status: done
claimed-by: claude/law-wiring-audit
pr: #5547
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:58:17.880Z
---

**What.** Laws take effect and most reach nobody, move no money and move no outcome measure. Build a checker that changes every law in drawn places and grades nine links, publish the matrix, then wire every family of laws on its own pull request. Each family's engine records whom it applied a law to through lawApplied.

**Rules.** An effect is a read: the engine that pays or decides reads the law and records whom it applied it to. One model, two tiers: counted groups take the same rule as full people. Wire to the world: every law moves money or people in a played world.

**Done when.** In two places drawn from all 56, the checker scripts/law-wiring/check.ts on buildBenchWorld shows every law wired on all nine links or carrying a specific stopgap row, docs/reports/law-wiring-matrix.json shows it, and each family test names record ids.

**Files.** scripts/law-wiring/check.ts, src/core2/law-reach/applied.ts, src/core2/law-reach/host.ts, docs/reports/law-wiring-2026-10-20.md

**Notes.** TODO
