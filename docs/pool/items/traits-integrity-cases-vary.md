---
id: traits-integrity-cases-vary
title: "Bringing a case, an official helping, a staffer seeing it through and hiring staff weigh cases that vary, at calibrated sizes"
area: people
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/traits-integrity-cases-vary
pr: #6001
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T07:54:26.343Z
---

**What.** Four integrity decisions cannot reach a researched size in a played year. An official's own call on a constituent case weighs the same constant case every time, so its weight only sets a trait bar; a staffer's follow-through runs too rarely to calibrate; bringing a case and hiring staff have no study and run at overwhelming odds at the general weight (net odds ratios 44 and 20 between the thirds in Jerry City, Ohio). The corruption decisions also count personality twice: the chooser adds the decision's trait term and the circumstances add a temperament reason. Give each case its own recorded circumstances, keep one trait term per decision, and calibrate.

**Rules.** No dice: cases come from each person's recorded circumstances, never a roll. Sliding scales: no constant case that turns the weight into a trait bar. Research before building: handle-case and follow-through calibrate to Barrick and Mount 1991, corruption to Pletzer et al. 2019, the rest to the single-decision range with a gap row.

**Done when.** scripts/traits/trait-wiring-audit.ts played, flat and mirror twins and trait-wiring-matrix.ts on one year of buildBenchWorld in two places drawn from all 56, seeds named, show constituent-cases.handle-case and staff.follow-through with net odds ratios within a factor of two of 2.44, bring-case and staff.hire between 1.2 and 3, and corruption.take reading one trait term; a test names the record ids. **On screen.** Nothing yet: it would show on Politics → Government, and nothing there reads it.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/modules/staff.ts, src/core2/modules/corruption.ts, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 24 by the traits lead from the integrity family's twin audit (Jerry City, Ohio, place key 3939074, seed 3c281162294d). The traits-wire-integrity PR keeps these at the general weight with gap rows. Oct 24, 20:55 (traits lead, claude/traits-integrity-cases-vary, head b01e01d77b, in progress): each case now carries its own circumstances. An official weighs the problem's severity, their closeness to the resident and the office's open caseload (sliding, half at caseLoadHalf). A staffer's follow-through and an official's hiring read that load. A resident's interest in politics (engagementOf) eases bringing a problem. A resident who knows no official goes to the office with the fewest open cases, then the senior one; before, every stranger went to the senior official, so one official handled every case and their temperament could not vary. Provisional: bringing a case at weight 0.08 reaches net odds 1.49 against 1.68 in North Dakota place 0538540 (seed 5b04feb9467d); case effort 1.36 and help base -0.3. Still to do: refit handle-case, follow-through and hiring on played years with the new tie-break (two drawn places, twins and matrix), then the PR. The integrity branch's own weights (bring-case 0.51 and staff.hire 0.65 by the lean-gap convention) are replaced here by the net-odds fit.

Sent back 2026-10-25 from PR #6001 (branch claude/traits-integrity-cases-vary): explicit integrity parent #5715 remains open/unmerged; merge/review the parent family first, then integrate main and rerun reduced cases calibration slice; finish on that branch, merge main into it first.
