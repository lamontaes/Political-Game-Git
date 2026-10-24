---
id: elections-runner-left-without-filing-on-reweigh
title: "A runner from the first weighing is left with no filing when the seat is weighed again at filing"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/candidacy-in-play.test.ts fails on clean main with PW3_SEED=0c6014c02a3b7d48 (Las Piedras, Puerto Rico): decision contest:seat:municipio:72085:board:0:2027-11-02:person_0e46e525eaeeb56b says run, the contest's filing day came, and the decision has no filing record. fileRunners (src/core2/modules/candidacy.ts) weighs the contest again when filing opens and files only that second weighing's runIds, so a runner from the first weighing who is not in the second keeps run true with no filing and no refusal. The laws lead found it in its gate on Oct 24 and confirmed it on main with the same seed.

**Rules.** No dice: whether a first-round runner still files comes from their recorded reasons on the filing day, never a roll; replace, never layer: one filing step answers every decision that says run, filing it or recording why not.

**Done when.** Every decision that says run on its contest's filing day ends with a filing or a refusal with its unmet reasons; candidacy-in-play.test.ts passes on PW3_SEED=0c6014c02a3b7d48 and on two fresh random seeds named in the PR body.

**Files.** src/core2/modules/candidacy.ts, src/core2/candidacy-in-play.test.ts

**Notes.** TODO
