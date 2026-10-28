---
id: play-stop-15-family-unexplained
title: "My family is the Steins, I am Bo Snider, and nothing explains who they are"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6422
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** I made Bo Snider on the v0.22.10 release. The first evening at home shows five people; hovering names John, Paula, Parker and Madison Stein, and nothing on screen says they are my family until I click one ("father"). The People web adds sisters Luna and Elizabeth Stein, grandmother Blair Stein and uncle Brandon Valentine; nobody shares my surname and nothing says why. The fifth person in the room is unnamed. I expected a line on the first night saying who lives with me.

**Rules.** Serves LAW.md §2, People in rooms and figures; LAW.md §4, Scenes and conversations. This is a game, not a spreadsheet: the first evening should introduce the household. No hand-written player text: the introduction comes from the English engine from the household records.

**Done when.** The owner does the same steps on the next build and is not stopped: on the first evening the player can tell without clicking who each person in the room is to them, and a surname that differs from theirs is explained or matches. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** On the first evening a few sentences of narration say who is in the room and how each is your family, and a surname different from yours is explained.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/opening-story.ts, src/bench/opening.ts, src/bench/family.ts, src/bench/scene.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:52; screenshots 11, 13, 23. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Sent back 2026-10-26 from PR #6096 at unchanged 09f75acc38ea810bc0df360a150c85dcd559e8f9 (branch play-first/play-stop-15-family-unexplained): the Words session 02:26 required fix is still absent; src/director/household-intro.ts:117 composes the English possessive side phrase in the director. Pass the sourced parent relation as its own fact and let the English bank pieces and slot declaration own the phrase, retaining the record/side tests and the Words-approved nine pieces. The household-name ruling is already approved; the stale owner question and screenshot backticks were corrected in the body. No local gate or screenshot inspection claimed on this source-blocked attempt. Finish on that branch, merge main into it first.

Sent back 2026-10-26 14:15 UTC from PR #6096, checked ec28f462952df9c45d5885d9d403de8ea9be47db (branch play-first/play-stop-15-family-unexplained): Words parent-fact/bank correction acknowledged, but live custom creator in retained Cruz Bay VI root 5e1ab178f4d23226eff97e9fe2a1137d, world 7d33ee8a2adc271d1e72e270266cb6e2b42eda057cf0459f3a15783ea7d7fead, Bo Snider born 2007-02-03, gives stale Richard/Alexa/Logan Kelley pointOut names against Snider narrator names for identical IDs. opening.ts:112/136/161 uses pre-creator story names; re-resolve current IDs throughout home/family opening metadata and add the openingFrames-after-creator regression, retaining this input and the approved English fix. Static gates and new tests 3+3 / scene-bank 2 pass, pool 36 matches main, but live browser name comparison fails; no green browser gate. PROGRESS branch hunk dropped, dated code notes removed, all own browser/bench processes stopped. Finish on that branch, merge main into it first.
**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:52; screenshots 11, 13, 23. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2. Playtest Oct 26 sitting 1 (installed v0.34.0): Player Jackson Knox, brother Leo Roberts, parent Kendall Roberts, father Brian; nothing explains the surnames and nobody is introduced. Calendar also lists birthdays of Aditi and Wesley Roberts, never introduced.

Fixer 6 (Oct 27): superseded by PR #6422 (household shares the chosen family name; the opening labels people by current names; narrator lines not carried).
