---
id: director-scene-packets-carry-their-cause
title: "A home or work scene's packet carries what happened: the employer, the years, the school, the cause of the quarrel"
area: director
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-pre-office
pr: 10138
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: Story, Nov 18, review of the first bank 5 lines (patterns B5-03, B5-06, B5-07, docs/story/scene-patterns.json): the scenes could name only the person, the player and the town
checked:
---

**What.** The scenes of home and work life (a layoff, a friend asking for help with a job, the day after school ends, the first day at a job, a quarrel with a neighbor, an apology, making up) have to say what happened, in the words of the people in it. Today their lines can name only the person, the player and the town. A boss cannot say which company let the player go or how long they worked there. A parent cannot name the school. A neighbor cannot say what the quarrel is about. Seen: the talk box of each of these scenes, rebuilt on the cut.

**Cause.** Found in code: `composeBinding` in `src/director/purpose-scene.ts` builds a block of facts for some cause records (a job offer, `JOB_OFFERED_EVENT`, near line 815) but none for `work.job-lost`, the job-started record, `school.finished`, a soured tie or a family quarrel. Their packets carry only `name`, `first`, `place`, the kin or stranger flags, the tie flags and the asked-before flags.

**Fix.** Add one block per cause record in `composeBinding`, each reading only what the record and the engines that own it hold, each fact citing its record id: for `work.job-lost` and the job-started record, `employer` (from `said.organizationId`) and the years held (from the job record's start date, as people say it); for `school.finished`, the school's name and whether the player passed (`schoolId`, `passed`); for a soured tie or quarrel, its cause where the tie record names one; for `family.engaged` and `family.separated` (`partnerships.ts`), how long the two have been together and whether a child of either is in the house; for `life.death`, the person who died (`deceased`, a declared slot nothing sets today) and the cause (`cause`, from the record's `topic`); for care (`careFacts`), the illness by name from the health record and how long it has run; for rescue (`rescueFacts`), who else helped where the record names them. A fact the record lacks (severance, health cover ending, the next step after school) is listed as missing in the PR, not invented.

**Time box.** 3 hours.

**Rules.** No dice: every fact the packet carries is read from the cause record, never drawn or guessed. The simulation is the one layer that knows; a scene is a view of the record (owner, Oct 28). Talk says how it feels, never the figure (owner, Nov 11).

**Done when.** A second session plays a layoff, a day after school and a quarrel in drawn places, and the dev mode Trace on each scene lists the new facts with the record ids they came from.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts

**Notes.** Nov 18 (Story): 522 lines for eight of these scenes are written on `claude/story-lines-pre-office`, and 204 for move-in, rescue and care on `claude/story-lines-pre-office-2`. All are held for this item. Thin packets push the writers to pad: 167 of the 204 tack `{place}` on to carry an insert. Proposal, breakup and funeral are not written at all.
