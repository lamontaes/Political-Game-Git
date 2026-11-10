---
id: director-dev-and-play-missing-scene-kinds-the-owner-asked-for
title: "Five things the owner asked for on Nov 8 have no scene: starting a movement, forming a task force, calling a hard meeting, a campaign trail around the state and a 15-person debate"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-1-task-force, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-2-start-movement, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-3-hard-meeting, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-4-campaign-trail-stop, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-5-large-debate-field
model: sonnet
effort: medium
root: rc7-player-cannot-drive
lead: director
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, root causes 6 and 7)
checked: fable 2026-11-10
---

**What.** On Nov 8 the owner named things a politician does that the player should be able to do, and five of them have no kind of scene: starting a movement, forming a task force, calling a hard meeting, a campaign trail around the state and a 15-person debate. On Nov 10's main (commit 8ac2262853) `src/director/data/situation-types.json` holds 103 kinds and none of the five. The engines under three of them already keep records nothing stages: a study committee is a row in the body engine, a resident in a crowd can found a standing group, and a debate is a sitting the player takes part in. Each kind is built as a scene through the engine that exists, one per PR, reachable in play by the office or campaign that would really do it and causable from dev mode by running that same game code. Seen: five scenes the owner named on Nov 8: start a movement, form a task force, a hard meeting, a campaign trail stop, a 15-person debate.

**Cause.** Design: docs/coordination/voice-notes/2026-11-08-story-and-night.md (the owner's words, Nov 8) and the Nov 8 to 9 task-force call in docs/coordination/OWNER-DECISIONS.md. Found in code: `referToStudy` (`src/core2/modules/legislature.ts` line 4940) forms a study committee whose only reader is its own test (`src/bench/study-committees.test.ts`); `src/core2/modules/public-action.ts` lets a resident found a group; the dev scene list says "No game code to attach to" for a kind with no recipe (`src/bench/dev-mode.ts` line 1359).

**Fix.** Build each kind as a scene in its own part: a cause record, a cast from the world, a purpose with four replies, and an ending another engine reads. The five parts are listed in Waits on. This item closes when all five are merged and a second session has done the acceptance below.

**Time box.** 2 hours for one Sonnet session for the closing check once the five parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** This is a game, not a spreadsheet: each of the five is here because the owner asked for it by name on Nov 8, and none adds a step the player must take. Wire to the world: each scene's cause is a record an engine already keeps or a registered stopgap naming the engine that should, and each ending moves a bill, a group, a race or a tie that another engine reads. No dice: who joins, who carries, who shows up and how many file follow their records and reasons, never a roll. One rule, all 56 places: which executive may form a task force, and how a statewide race travels, are read from the place's data. Owner, Nov 8, 2026: "can you start a movement?"; "Starting committees and task forces to research things? Having a contentious meeting with a secretary or a legislator or an executive"; "campaigning around the state"; "there's 15 people at the debates. Maybe sometimes, there's just 2 or 3". The night Coordinator's call on task forces (docs/coordination/OWNER-DECISIONS.md, Nov 8 to 9, 2026; the owner may overrule): "a record in the one body engine. One is formed when a body refers a split bill to study, or by an executive's order... Story writes the scenes on top."

**Done when.** A second session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and opens dev mode's scene list: each kind built under this item is listed with a way to cause it, not "No game code to attach to". Through Advanced, Play as, it takes the seat that fits (a mayor or governor for the task force and the hard meeting, a resident or officeholder for the movement, a candidate for a statewide office for the trail and the debate), causes each scene from dev mode, answers it, and keeps a screenshot. For each it names the cause record id, how each person was cast, and the record id the ending wrote with the later record that shows another engine read it: the task force's report read by the next bill's positions and by the press; the movement's group and its members in the public-action records; the meeting's result on the bill or budget line it was about; the trail stop's effect on views in the place visited; the debate with every candidate on the contest's record answering. It then plays a year without forcing anything and lists, from the crew's scene tool on the same seed (`node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> --out <file>`) and from browser play, which of the kinds fired on their own. A kind that could not be built in the time box has a pool item with its lead and the engine record it waits on. The audit named no place for this reading; its dev-mode screenshots are from Ten Broeck, Kentucky, so repeat the dev mode scene list there. The owner plays it: as a mayor he can order a task force and sit down with a department head who disagrees, and as a citizen he can start a movement instead of only joining one.

**Waits on.** Its five parts: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-1-task-force, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-2-start-movement, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-3-hard-meeting, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-4-campaign-trail-stop, director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-5-large-debate-field. Words writes the lines; scenes go through the scenes-from-life skill.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/circumstances.json, src/director/purpose-scene.ts, src/core2/modules/legislature.ts, src/core2/modules/public-action.ts, src/core2/modules/meetings.ts, src/bench/dev-mode.ts, data/english/parts/scene-talk.json

**Notes.** From the Fable audit, Pillar 4 ("What you asked for on November 8 (read)") and root cause 7 ("You cannot call a meeting, start a movement or run a campaign trail"). The audit read this in the code and played none of it. The owner's words are in docs/coordination/voice-notes/2026-11-08-story-and-night.md.

Look-first, Nov 10: no pool item, open or done, covers any of the five as a scene (searched docs/pool/items for task force, study committee, movement, found, rally, march, hard and contentious meeting, secretary, statewide, around the state, trail, field size, 15, debate). The Nov 8 rulings check (docs/reports/rulings-check-2026-11-08.md) marks them: start a movement, partly ("A resident at a protest can found a group; you can only join one"); committees and task forces, not done; a contentious meeting, partly ("From bills and budgets only; no secretary; you can't call one"); field sizes up to 15 at a debate, partly ("no wave or party in disarray makes 15 run"); campaigns around the state, partly ("no trail around the state").

What belongs to other leads, to be filed as their items when the builder reaches them, not built here: an executive's order that forms a task force (the body engine, Legislation); what makes a field swell after a wave (Elections; gov-wider-race-counted-candidates and elections-out-party-fields-district-seats are open and near it); a campaign's stops in other places (the campaigns engine; the rest of the state is counted groups). Words writes the lines; scenes go through the scenes-from-life skill.

Not verified: whether the debate sitting can stage a large field (I did not find a cap and did not run one), and whether any played year forms a study committee near the player (the test draws places until one does).

Related: words-scene-web-the-campaign and words-scene-web-the-executive (open; rows for missing scenes), play-campaign-acts-as-scenes (open), scene-disaster-first-hours (open), director-no-scene-without-a-purpose and director-casting-rule-on-every-scene-kind (the rules every new kind must meet).
