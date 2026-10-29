---
id: death-cause-tests-red-by-draw
title: "Two death-cause tests red on main by draw: a drug overdose death assigned 'other' (Kingston, Rhode Island) and firearm homicide's hazard factor not moved (Malaeloa/Ituau, American Samoa)"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main (87f5634c92, Oct 29 01:30 UTC) two tests fail on drawn seeds. src/core2/death-cause.test.ts with DEATH_CAUSE_SEED=9c7ce4dc6075f587 (Kingston, Rhode Island): 'assigns causes by record, and the shifted links raise the right causes at the right ages' fails with "expected 'other' to be 'drug-overdose'". src/core2/death-cause-firearm-homicide.test.ts with FIREARM_HOMICIDE_SEED=0ca4bee1b70dbf0c (Malaeloa/Ituau, American Samoa): 'moves the cause's share and every person's death hazard' fails with "expected 1 to be close to 1.1664", so a person's hazard read no firearm homicide factor there. Found by the laws session's mortality helper and confirmed on main; other seeds pass, so either can turn a PR's run red.

**Rules.** One rule, all 56 places: each test keeps drawing its place and names the place and seed, and a territory with no record behind a cause is passed over by name, never by a place name in code. The chain is the acceptance: a cause of death is assigned from the person's records, never a fixed share.

**Done when.** Both tests pass on the named seeds and on three further random seeds each, named in the PR body; the PR body says why Kingston's death read 'other' and why the American Samoa hazard read 1 (the record or rule at fault, by file and line) and what changed.

**Files.** src/core2/death-cause.ts; src/core2/death-cause.test.ts; src/core2/death-cause-firearm-homicide.test.ts; src/core2/health-web.ts

**Notes.** TODO
