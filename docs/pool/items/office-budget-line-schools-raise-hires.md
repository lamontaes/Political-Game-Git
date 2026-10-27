---
id: office-budget-line-schools-raise-hires
title: "A raise to the schools line hires named unemployed adults at the public schools: proved in a drawn place"
area: office
kind: wiring
priority: 3
size: S
status: done
claimed-by:
pr: #5632
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** PR #5588 proved a schools line cut ends teachers' jobs; the raise path (hire from the town's adults without work) is unproved.

**Rules.** An effect is a read not a record; No dice; One rule all 56 places

**Done when.** In a drawn place and seed a mayor's raise to the schools line hires at least one named adult at the district, followed by record id.

**Files.** src/core2/budget-line-schools-staffing.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5632 (branch claude/schools-raise-test): school teachers are counted workers since #5568, so the budget-line-schools-staffing test's named-teacher precondition never holds and it fails in every draw with main merged in; prove the line change on the district's counted payroll; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5632 (branch claude/schools-raise-test): Merging current origin/main conflicts in src/core2/budget-line-schools-staffing.test.ts and src/core2/law-reach/group-a-staffing.ts. Resolve both code conflicts against current main while preserving the counted-teacher hire and layoff proofs, then rerun the changed-file gate. The earlier fix commits are present, but the current merged result cannot be checked until these conflicts are resolved.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5632 (branch claude/schools-raise-test): The conflict repair preserves the counted-teacher hire and layoff paths, but the body has no Done when evidence table. The item requires a drawn place and seed where a mayors schools-line raise hires at least one named adult at the district, followed by record id. The body mentions an earlier failing Rio Rancho draw with an abbreviated seed and later comments report passing tests without the successful hire id and full reproducible draw. Add that acceptance row with the successful place, full seed and hire/job record id. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5632 (branch claude/schools-raise-test): group-a-staffing.ts:307 concatenates full candidates before counted candidates instead of ranking one shared list, and :315-316 lays off all full staff before counted staff rather than newest hires across both; prove hiring/layoff order is unchanged by fill-in; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5632 (branch claude/schools-raise-test): integrated group-a-money.ts:46 removes township from governmentFor, so a township-only paid-leave law loses its paying government; restore main township support and its regression, and correct the stale full-candidates-first body description; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #5632 (branch claude/schools-raise-test): corrective head f8032533e8 fixes the township regression but a normal merge of current main conflicts in src/core2/law-reach/group-a-staffing.ts; resolve the code conflict preserving main and the shared named/counted staffing rank, then rerun the changed-file proofs; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5632 (branch claude/schools-raise-test), checked 8d6902b742bd7e42c5305594cf578d57f7543e91: budget-line-schools-staffing.test.ts:134-140 replaces the adopted-line assertion with a redraw on a differing or missing adopted budget, so an eligible world with broken adoption can be discarded. Assert the eligible world or distinguish a real recorded council amendment/rejection by bill and vote records; missing required output must fail. Keep a real producer-break control and correct body/release claims to the actual shared layoff-order diff, since shared hiring and before-bill staffing already exist on main. No local green gate is claimed. Finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back from PR #5632 again at merged-main head 8b020dc203: prior adoption-redraw/release claims were corrected and the government-specific bill filter strengthened, but staffing-order.test.ts:40 still selects eligibility using layoffOrder output and schools-staffing.test.ts:330-335 exempts all counted hires from prior-job evidence. Select employers from staff inputs alone and follow earlier active work in both tiers without output redraw or vacuous counted assertions; finish on claude/schools-raise-test, merge main into it first. Static checks pass (pool matches 34 baseline errors), fresh root 8a38ed23152d36591b17340fe343ca28 cut case passes in 229.791 seconds; remaining cases were stopped on source review and are not claimed green.

Completed 2026-10-26 in PR #5632, merged b2b10b39eaece5192c4c713f04c4395ff94ee2be at checked head 98c0ed9f6cdf3fb59a4dc8f30aab18d646a1cf53. Own root 8a38ed23152d36591b17340fe343ca28 draws Hooper Utah 4936400, seed 58fecdc8ec35f0439d44cbb23ea5caa9a75ec204a0b46870aeb4cc913a0685cf: 46 hires, 33 counted and 13 named, every prior-work check passes; budget budget:place:4936400:2025, council vote 3-2 on 2025-1. Full named job and old-job end date are in the Done-when table. Same-world real vote-producer break fails as required. All five changed test cases complete across the recorded runs; pool status done was applied with the requested exact node CLI and verified on main. Broader staffing-ratio proof stays open.
