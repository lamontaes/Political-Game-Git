---
id: words-debate-answers-not-campaign-stops
title: "A debate's answers stage as campaign-stop scenes for each candidate"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a debate day each candidate gets several campaign-stop scenes, one for each answer they gave, because the debate's answers are speech records the views engine reads, and the campaign-stop scene fires from any speech heard with the candidate as speaker. A campaign stop casts a volunteer and a crowd in the room, but a broadcast debate has neither, so these scenes put the wrong people in the wrong place. In Hainesburg, New Jersey (seed 8806321be2a3f9ab165d26019d4e7493d181cc7c, second draw), both governor candidates had four campaign-stop scenes on October 27, the day of debate:debate:contest:seat:US-NJ:governor:2025-11-04. The fix keeps the campaign-stop scene to speeches given face to face, as the campaign's own events are, and leaves a debate to its own scene.

**Rules.** Ask why: a scene's cast and place must match its cause record, and a broadcast answer has no room or volunteers. Wire to the world: the speech records still reach the views engine as they do now; only the scene they stage changes.

**Done when.** In the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, a test watches the candidates in a race that holds a debate and shows no campaign-stop scene caused by a speech record from that debate, while a campaign event's speech in the same world still stages its campaign-stop scene, both named by record id.

**Files.** src/director/data/situation-types.json, src/core2/modules/campaigns.ts, src/director/debate-opponent-scene.test.ts

**Notes.** Found while building words-debate-opponent-scene (#5975). Two pieces meet here. (1) On main, and on the scene chain that #5914 to #5977 carry, campaign-stop's match uses the singular key `causeFact`, which `causeMatches` in `src/director/scheduling.ts` never reads, so its "speaker is the subject" condition is dead. The same is true of veto-override's `sponsorId` and layoff's `decidedBy`. #4626 (the word pack) already rewrites all three as `causeFacts`. (2) #4626 also adds `speechOccasion`, under stopgap SG-DIRECTOR-speech-occasion, which reads a speech's occasion from its id. A debate answer's id is `speech:<candidate>:<date>:debate:<venue>`, so it comes out as "campaign" and still stages a campaign stop. The fix fits once #4626 and #5975 have merged: the speech record carries its occasion (`SpeechInput` in `src/core2/modules/speech.ts`, passed by `makeStatements` in `src/core2/modules/campaigns.ts`), replacing the stopgap, and campaign-stop keeps to a campaign's face-to-face speeches.

Evidence (words lead, Oct 27): the real-life packet `docs/design/scenes/from-life/the-local-candidate-debate.md` (League and chamber forums, calibration only) shows the format (moderator, timed answers, rebuttal, closing, audience cards) and the gaps: `holdDebate` (`src/core2/modules/meetings.ts`) writes one pass of positions per question with no rebuttal, moderator or hall audience, and no situation type stages the `debate:` record (`speech-afterward` excludes debates).
