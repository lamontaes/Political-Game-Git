---
id: tests-electoral-scenes-speech-crowd-member
title: "electoral-scenes: a person the speech names is not in its crowd (Bascom, Florida)"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/electoral-scenes.test.ts fails its second case on main on Nov 4 in Bascom, Florida (1203725), seed 78df996a2a76eb81378fcb7c5c00238bb398b33a: person_42e3dd4105e41fc4 was not in the crowd of speech:person_09cc581aaf91cdae:2025-10-05:speech:organization_f266a19676377820. A campaign speech is a stop with its listeners, and the listener the test checks is not among the crowd the speech record keeps, so the scene and the record disagree about who heard it.

**Rules.** One engine per mechanic: the scene's listeners are the speech record's crowd, read from one place; Ask why: name by record why this person was expected and why the crowd left them out before changing either side.

**Done when.** electoral-scenes.test.ts passes on seed 78df996a2a76eb81378fcb7c5c00238bb398b33a and on two more drawn seeds named in the PR, and the PR names by record id why person_42e3dd4105e41fc4 was or was not a listener.

**Files.** src/director/electoral-scenes.test.ts, src/core2/campaign-turn.ts

**Notes.** TODO
