---
id: justice-bail-moves-the-cash
title: "Pretrial bail is marked posted but no money moves to the court"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Pretrial bail from PR 5200 marks a bail posted but moves no money: liquidMinor >= pretrialBailMinor decides held or posted, and nothing moves from the person's account to the court's. Posting bail should be a movement on the journal from the person's account to the court's, returned at disposition, so the other engines read a real dollar. If that cannot land now, register a stopgap row with a marker and name it in the item notes.

**Rules.** An effect is a read, not a record: a posted bail is a dollar on the journal another engine reads, so the posted bail and its journal entries must both exist, and the marker is only the stopgap while they do not.

**Done when.** In a drawn place (buildBenchWorld, seed named in the PR body) one played year shows one bail posted, with the journal entry ids for the move out of the person's account and into the court's, and the return at disposition; the justice tests (npm test -- src/core2/justice) pass.

**Files.** src/core2/justice-pretrial.ts, src/core2/modules/justice.ts, src/core2/justice-pretrial.test.ts, src/core2/data/justice/parameters.json, src/core2/data/stopgaps.json

**Notes.** Found from PR 5200, merged Oct 19 23:26 UTC. The files are the ones that PR touched: gh api repos/lamontaes/Political-Game-Git/pulls/5200/files. The id uses the justice prefix from the owner's ask; its area is gov. Claim released Oct 23: branch idle since Oct 20.

Built: posted bail posts a journal entry person to treasury (`bail:<case>`), returned at trial (`bail-return:<case>`); test in src/core2/justice-pretrial.test.ts. Held by the prosecuting government's treasury, not a separate court account (none exists).

Taken over Oct 23 at the owner's request from glm/justice-bail-moves-the-cash, whose session ran out of usage with no branch pushed. Its last finding: a played year of its drawn place opened no justice case at all, so no bail was posted; the remaining work is that witness, not the journal code.

Sent back 2026-10-23 from PR #5847 (branch claude/sleepy-carson-f8omzd): Normal main integration conflicts in src/core2/office-day-clemency.test.ts after the Eaton repair #5779; preserve its pinned/random review-eve proof together with the new hearing timing, and rerun the bail/plea chain checks; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5847 (branch claude/sleepy-carson-f8omzd): The only positive bail witness injects up to 600 bribe offers, while all seven ordinary years post no bail; retain the fixture but supply the ordinary producer-to-journal chain or preserve it as unfinished bounded work; finish on that branch, merge main into it first.

Oct 24: PR #5847 now completes justice-plea-waits-for-hearing (pleas wait for the hearing, the prosecutor's workload capped at a full desk, the two justice tests built on their drawn place, and a forced-offer proof of the bail journal). This item stays open for the ordinary witness Merger 3 asked for: one played year with nothing forced that goes offer, charge, posted bail and return, by journal entry id. In 7 ordinary worlds no bail was posted: 4 had no bribe offer, 2 ended cash bail through the game's state legislature (Delaware SB 6, Hawaii SB 4), and in 1 the defendants lacked $10,000 in cash (PR #5847 body).
