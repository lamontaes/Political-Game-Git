---
id: tests-electoral-scenes-speech-crowd-member
title: "electoral-scenes: a person the speech names is not in its crowd (Bascom, Florida)"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: director
model: opus
effort: medium
root: none
---

**What.** src/director/electoral-scenes.test.ts fails its second case on main on Nov 4 in Bascom, Florida (1203725), seed 78df996a2a76eb81378fcb7c5c00238bb398b33a: person_42e3dd4105e41fc4 was not in the crowd of speech:person_09cc581aaf91cdae:2025-10-05:speech:organization_f266a19676377820. A campaign speech is a stop with its listeners, and the listener the test checks is not among the crowd the speech record keeps, so the scene and the record disagree about who heard it. The fix is whichever side is wrong, the scene's cast or the speech's crowd. The campaign code the item named, src/core2/campaign-turn.ts, is gone; the speech and its crowd now live in src/core2/modules/campaigns.ts.

**Cause.** Needs cause. Looked at the second case of src/director/electoral-scenes.test.ts and the speech crowd rows in src/core2/modules/campaigns.ts: why person_42e3dd4105e41fc4 was expected as a listener and why the crowd left them out was not traced by record. Measured: GOLDEN_PATH_SEED=78df996a2a76eb81378fcb7c5c00238bb398b33a, Bascom, Florida.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** One engine per mechanic: the scene's listeners are the speech record's crowd, read from one place. Ask why: name by record why this person was expected and why the crowd left them out before changing either side. One rule, all 56 places: the check holds on every drawn place.

**Done when.** A second session runs src/director/electoral-scenes.test.ts on seed 78df996a2a76eb81378fcb7c5c00238bb398b33a and on two more drawn seeds named in the PR and sees every run pass. The PR names by record id why person_42e3dd4105e41fc4 was or was not a listener, and the scene and the speech's crowd read the same list.

**Waits on.** Nothing.

**Files.** src/director/electoral-scenes.test.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
