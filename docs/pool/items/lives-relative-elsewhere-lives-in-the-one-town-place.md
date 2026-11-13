---
id: lives-relative-elsewhere-lives-in-the-one-town-place
title: 'In Washington, D.C., a sister''s letter "has come from District of Columbia" and asks the player to visit her there'
area: people
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
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Washington, District of Columbia (bench seed f303bf09-c2c8-4133-b1fc-79bf54763b00, main 5e68cde1). On March 2, 2025: "A letter from Priya Villanueva has come from District of Columbia. They have something to ask you." Then Priya writes: "Come and see me in District of Columbia, Anya. I would love to show you what it's like here." The player lives in Washington, D.C., which is all of the District, so the sister writes from where the player already lives, as if from far away. Seen: the letter scene's narration and the relative's ask, naming where the relative lives.

**Cause.** Measured: Washington, District of Columbia, bench seed f303bf09-c2c8-4133-b1fc-79bf54763b00, played with Week from a new life. src/director/letter-facts.ts `letterFacts` says the writer's `placeId` through `placeSaid`. For a relative living outside the played town, that place is the state's "rest of the state" place. In a place that is the whole state or territory (D.C.), that place is named for the District itself. Which engine places relatives there (the lives tier) is not yet traced.

**Fix.** Find where a relative who left the played town is given a place (skill `lives`). Where the state has no other place outside the played town, give them a place in a neighboring state, or keep them in the town, from the same records. The letter then names a real somewhere else, or no letter comes "from" where the player lives. A letter's `hometown` that is the player's own place is not said as if far away.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the rule covers every place whose state is a single place (the District and any territory like it), with no place named in code. Wire to the world: the relative's place is a record the letter reads, not a word chosen for the letter.

**Done when.** A second session, on main, plays a new life in Washington, District of Columbia (drawn, or replayed with the seed above) for three months with Week, and takes a screenshot of every letter from a relative. None says it has come from the District the player lives in, and any invitation names a real place elsewhere.

**Waits on.** Nothing.

**Files.** src/director/letter-facts.ts
