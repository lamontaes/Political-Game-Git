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
model: fable
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The scene web's legislating domain lists vote-sought, vote-confirmed (2 causes), bill-carry (2 causes), section-bargain and vote-asked (3 causes). In two played years (Cumberland, Wisconsin, seed pass1-1659; Port Angeles, Washington, seed pass2-22133) each fired 0 times while floor-vote fired 115 to 197 times. All have an episode packet and lines for every speaker. Seen: the talks where the player asks a member for a vote, carries a bill or trades a section, on the golden path's negotiate step.

**Cause.** Needs cause. Measured: npm run scene-web on both seeds, rows with firedInYear 0 for the five types. Not yet traced: whether the cause records (vote-ahead, vote-promise, carry-asked, bill-amendment trade-amendment, veto-override) are written in a played year with the player as subject, or the subject is never a member.

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** Ask why: name the record and the code that does or does not read it. Wire to the world. Serves scene-producers.

**Done when.** A second session runs `npm run scene-web` on a drawn place and a seed nobody chose, and reads firedInYear for the five legislating types: each is above zero, or the page names the record id it waits on.

**Waits on.** Nothing

**Files.** scripts/scene-web/build.ts, src/director/data/situation-types.json, src/core2/modules/legislature.ts
