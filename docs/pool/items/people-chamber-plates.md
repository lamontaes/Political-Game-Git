---
id: people-chamber-plates
title: "Mannequin plates for the meeting chambers, so members are drawn in their seats"
area: art
kind: feature
lead: cto
priority: 1
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: play-first lane and people session, Oct 29 (the owner asked for the members drawn in the chamber)
after:
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
---

**What.** When the player's meeting opens, every member is unplaced with reason no-plate, so the chamber is drawn empty behind the meeting panel. People are drawn only on a room's mannequin plate (owner, Oct 28 and 29; people-pack skill), and no meeting chamber has one: the plates on main are home, colonnade, depot and the two standard Oval rooms. The owner asked for the members drawn in the chamber. Until plates land, the lane shows members as faces on the panel, a registered stopgap. This is full-body staging, and on Nov 10 the owner ruled that staging waits while busts are decided.

**Cause.** Measured: Brookside, Delaware, seed 4d50e1f88df997f9, county-commission: every member unplaced with reason no-plate (lane report, the item). Code: plates are read by src/bench/mannequin-plates.ts and the staging engine stagePeople.

**Fix.** The art session paints a plate per chamber in the standard camera (room-spots skill): council-chamber, council-chamber-small, council-chamber-large, county-commission, county-commission-rural, school-board-room, state-house-chamber, state-legislative-chamber-bicameral and state-legislative-chamber-unicameral. Each plate has a seat per member at the dais (a role on the presiding seat, matched by seatRoles in src/bench/data/whole-figures.json), a lectern or public-comment spot, and a few audience seats. A plate names one backdrop file; for night light either each light gets its own plate or one loader change in src/bench/mannequin-plates.ts adds an optional backdrops list beside backdrop. The pack must paint every pose the chamber plates use for every person (people-pack-v4-pose-gaps).

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: chamber plates are art data read by the one staging engine (stagePeople), with no place named in code. Replace, never layer: when a chamber has a plate, the lane's faces-on-the-panel stopgap for that room is removed in the same change. Placeholders: a chamber or light without a plate stays a registered stopgap until painted.

**Done when.** A second session plays a council or commission meeting in a drawn place (name it and the seed) and sees every member drawn in a dais seat on the chamber's plate, the presiding officer in the kept seat, with no member unplaced as no-plate; a screenshot shows it. src/bench/people-pack.test.ts passes, including "fits every plate to a backdrop the game has".

**Waits on.** The owner's decision on how busts are shown (OWNER-DECISIONS.md, Nov 10, "Staging waits for busts"); full-body staging is not built while busts are coming.

**Files.** art/people-rooms/mannequin-plates/, art/backdrops/manifest.json, src/bench/mannequin-plates.ts, src/bench/data/whole-figures.json

**Notes (Nov 11, 2026, set aside).** Dropped: the owner ruled on Nov 10, 2026 (about 9:24 p.m.) "Remove all the people," and at about 9:27 p.m. "people will eventually be in the game, but right now for early access, it's just we have to do the busts." No plate is painted or measured while rooms draw nobody. The full-body system and what comes back after early access are in docs/art/full-body-people-after-early-access.md; this item is rewritten from that record when full bodies return.
