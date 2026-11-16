---
id: words-oath-says-council-member-for-a-board-of-trustees
title: 'The oath swears a village trustee in as "council member" while the scene calls the others members of the Board of Trustees'
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Second words reader, Nov 15, on #9581 (rule 136 played file, Thompsonville)
---

**What.** At a village whose body is a board of trustees, the swearing-in says "You are about to take the oath for council member" and "to serve as council member", while the same scene names the colleagues "a member of the Thompsonville Board of Trustees". One body, two names.
Seen: Thompsonville, Illinois (1775159), seed 4276344481a2b078e70633cfee47d0caccb65f74:4, the player sworn into the council seat (/mnt/project-files/words-lead/who-they-are/who-played-3600c43f.md).

**Cause.** Found in code: src/director/swearing-in.ts `swornOffice` sets `title: office.title`, the offices row's generic "Council member", and never reads the member word of the body. src/director/cause-facts.ts `raceMemberTitle` already reads it for a race through `memberOfBody(office.bodyName)` (data/english/seat-words.json), which gives "trustee" for a Board of Trustees.

**Fix.** In `swornOffice`, take the title from `memberOfBody(office.bodyName)` when the office has more than one seat and the body is named for its members, and fall back to `office.title`, the same read `raceMemberTitle` makes (share one helper rather than a copy). No new words.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: every body named for its members (trustees, aldermen, selectmen, commissioners, supervisors and the rest), not one town.

**Done when.** At Thompsonville IL (seed above) the oath says trustee and the colleagues stay members of the Board of Trustees, and at a drawn place with a seed nobody chose whose body is a City Council the oath still says council member; a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/director/swearing-in.ts, src/director/cause-facts.ts
