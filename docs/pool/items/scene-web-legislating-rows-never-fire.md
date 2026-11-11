---
id: scene-web-legislating-rows-never-fire
title: "Five legislating scene rows (vote-sought, vote-confirmed, bill-carry, section-bargain, vote-asked) fire zero times in a played year"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
---

**What.** The scene web's legislating domain lists vote-sought, vote-confirmed (2 causes), bill-carry (2 causes), section-bargain and vote-asked (3 causes). In two played years (Cumberland, Wisconsin, seed pass1-1659; Port Angeles, Washington, seed pass2-22133) each fired 0 times while floor-vote fired 115 to 197 times. All have an episode packet and lines for every speaker. Seen: the talks where the player asks a member for a vote, carries a bill or trades a section, on the golden path's negotiate step.

**Cause.** Measured: `node --import tsx` with a copy of scripts/scene-web/build.ts's world (kept outside the repository), Cumberland, Wisconsin (5518025, seed pass1-1659), one played year on main 061eda78. Two of the five fire and the page cannot see them; three wait on records the year never writes for a watched person. (1) Found in code: the director's monthly `forget` (src/director/ledger.ts, about line 692) drops every moment older than `directorMemoryRecentDays` from a watched person who is not the player, beyond their strongest few, and drops its schedule entry with it. scripts/scene-web/build.ts (about line 193) counts schedule bindings only after the whole year, so a scene staged early in the year is gone by then. Counted day by day as staged, vote-asked fired 5 times and section-bargain 5 times (for example person_4dde2c116e1de5c4 and person_5fa22abdbd3a799c on 2025-02-04, from bill-amendment:bill:office:gus2025:177084:council:2025-02-04:person_5fa22abdbd3a799c:14:office:gus2025:177084:council:floor:1, a council trade-amendment). The same count gives floor-vote 280, against 191 on the page. (2) vote-sought waits on `vote-ahead`, which src/core2/modules/legislature.ts writes only when the player holds a seat on the body (about line 600); the scene-web player holds none. (3) vote-confirmed waits on `vote-promise` (legislature.ts, `recordPromises`, about line 4816) or a veto override. The year wrote 3 promises, all in state chambers, whose members are not watched. (4) bill-carry waits on `carry-asked` (legislature.ts `askToCarry`, called by `proposeAsExecutive` from src/core2/modules/world-legislating.ts line 594), and the year wrote none.

**Fix.** In scripts/scene-web/build.ts only. (1) Advance the year one day at a time, not in one call, and after each day add every schedule entry not seen before (by person and moment id) to the count, so a scene counts when it is staged, before `forget` drops it. A year took about 90 seconds this way, the same as one call. (2) For each row still at zero, print the cause record it waits on and how many of those records the year wrote with a watched person named, taken from the durable log by kind (`vote-ahead`, `vote-promise`, `carry-asked`, `bill-amendment` with `kind` trade-amendment). For `vote-ahead`, say it is written only while the player holds a seat. Change no game code: the director and the legislature engine do what they should. Whether a seated player meets vote-sought and the rest is the golden path's question, and belongs to the negotiate step's own check, not to this page.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Ask why: name the record and the code that does or does not read it. Wire to the world. Serves scene-producers.

**Done when.** A second session runs `npm run scene-web` on a drawn place and a seed nobody chose, and reads firedInYear for the five legislating types: each is above zero, or the page names the record id it waits on and how many of those records the year wrote. In Cumberland, Wisconsin (seed pass1-1659) the page shows vote-asked and section-bargain above zero.

**Waits on.** Nothing

**Files.** scripts/scene-web/build.ts, src/director/ledger.ts, src/core2/modules/legislature.ts, src/core2/modules/world-legislating.ts

Nov 11 (cause finder for Fable B): traced in Cumberland with a probe outside the repository and three temporary logs in src/director/ledger.ts and src/director/scheduling.ts, since undone. Council trades reach both members, clear the moment floor at 0.29, and bind vote-asked and section-bargain. The director then forgets them, being non-player moments, before scene-web looks. The other three types need a seated player or a watched state member, which this year does not have.
