---
id: death-cause-tests-red-by-draw
title: "Two death-cause tests red on main by draw: a drug overdose death assigned 'other' (Kingston, Rhode Island) and firearm homicide's hazard factor not moved (Malaeloa/Ituau, American Samoa)"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: macro-country-jobs-over-workers-mid-cycle-start
blocked-on:
lead: laws
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** On clean main (87f5634c92, Oct 29 01:30 UTC) two tests fail on drawn seeds. src/core2/death-cause.test.ts with DEATH_CAUSE_SEED=9c7ce4dc6075f587 (Kingston, Rhode Island): 'assigns causes by record, and the shifted links raise the right causes at the right ages' fails with "expected 'other' to be 'drug-overdose'". src/core2/death-cause-firearm-homicide.test.ts with FIREARM_HOMICIDE_SEED=0ca4bee1b70dbf0c (Malaeloa/Ituau, American Samoa): 'moves the cause's share and every person's death hazard' fails with "expected 1 to be close to 1.1664", so a person's hazard read no firearm homicide factor there. Found by the laws session's mortality helper and confirmed on main; other seeds pass, so either can turn a PR's run red. Guards: the cause of death the paper and a person's card name, which these two tests keep right.

**Cause.** Measured: on main 986f946b, `FIREARM_HOMICIDE_SEED=0ca4bee1b70dbf0c npx vitest run src/core2/death-cause-firearm-homicide.test.ts` (Malaeloa/Ituau, American Samoa) and the fresh draw `FIREARM_HOMICIDE_SEED=2afa0aac1a945a4e` (Dandan, Northern Mariana Islands) both stop before any assertion. They throw "The country tier holds counts that cannot be: US-AS: 22067.16 jobs for 22021.98 workers" (US-MP for Dandan) at src/core2/modules/macro.ts line 476. That is macro-country-jobs-over-workers-mid-cycle-start, whose cause is written in. The death-cause half (Kingston, Rhode Island) was already green this morning. Behind the throw, found in code: the test's `lay` (src/core2/death-cause-firearm-homicide.test.ts, about line 80) replaces the web month's two link effects with fixed values (`SHIFT`: +0.4 and -0.2, a product of 1.12) instead of moving them from what the place already had. In a place where both links already read about +0.08 (product 1.1664, as in Dandan on 79d23fa596 this morning), the "shifted" world's factor is lower than its twin's, and "expected 1.12 to be greater than 1.1664" follows. American Samoa's earlier "expected 1 to be close to 1.1664" (the base twin's cause factor at 30 read 1 with both effects at 0.08) is not traced; it cannot be seen until the throw is fixed.

**Fix.** After the macro item lands: (1) in src/core2/death-cause-firearm-homicide.test.ts, make `lay` add the shift to each link's own effect (`row.effects[SYG] + 0.4`, `row.effects[CCP] - 0.2`, the second net of the first so the product still rises), and compute the expected product from the shifted effects read back, not from `SHIFT` alone. No assertion is dropped. (2) Rerun American Samoa (0ca4bee1b70dbf0c). If the base twin's cause factor at 30 still reads 1 with nonzero effects, trace `causeMix` (src/core2/death-cause.ts) for that place and write the cause into this item before changing code.

**Time box.** 2 hours for one Sonnet session after the macro item lands. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: each test keeps drawing its place and names the place and seed, and a territory with no record behind a cause is passed over by name, never by a place name in code. The chain is the acceptance: a cause of death is assigned from the person's records, never a fixed share.

**Done when.** A second session runs both tests on the named seeds and on three further random seeds each, names each place and seed, and all pass. The PR body says why Kingston's death read "other" and why the American Samoa hazard read 1 (the record or rule at fault, by file and line), and a second session replays both seeds on main and sees the cause assigned from the person's records and the factor in the person's hazard.

**Waits on.** macro-country-jobs-over-workers-mid-cycle-start, which stops both territory draws first.

**Files.** src/core2/death-cause-firearm-homicide.test.ts, src/core2/death-cause.ts, src/core2/death-cause.test.ts, src/core2/health-web.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `DEATH_CAUSE_SEED=9c7ce4dc6075f587 npx vitest run src/core2/death-cause.test.ts` (Kingston, Rhode Island): green. `FIREARM_HOMICIDE_SEED=0ca4bee1b70dbf0c npx vitest run src/core2/death-cause-firearm-homicide.test.ts` (Malaeloa/Ituau, American Samoa): still red: "expected 1 to be close to 1.1664, received difference is 0.1664000000000001". Fresh draw `DEATH_CAUSE_SEED=996b1ae59f50e0ea FIREARM_HOMICIDE_SEED=2afa0aac1a945a4e`: death-cause green; firearm homicide red (Dandan, Northern Mariana Islands): "age 5: expected 1.1199999999999999 to be greater than 1.1664". The death-cause half is green; the firearm-homicide half is still red.

Nov 11 (cause finder for Fable B): reran both territory seeds on main. Each now stops on the country tier's jobs-over-workers check, filed and traced under macro-country-jobs-over-workers-mid-cycle-start. This morning's Dandan failure comes from the test laying fixed effects over the place's own instead of shifting them. The death-cause half stays green.
