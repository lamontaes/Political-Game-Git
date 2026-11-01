---
id: people-chamber-plates
title: "Mannequin plates for the meeting chambers, so members are drawn in their seats"
area: art
kind: feature
lead: cto
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: play-first lane and people session, Oct 29 (the owner asked for the members drawn in the chamber)
---

**What.** When the player's meeting opens, every member is unplaced with reason `no-plate` (lane report: `county-commission`, Brookside, Delaware, seed 4d50e1f88df997f9), so the chamber is drawn empty behind the meeting panel. People are drawn only on a room's mannequin plate (owner, Oct 28 and 29; `people-pack` skill), and no meeting chamber has one: the plates on main are home, colonnade, depot and the two standard Oval rooms. The owner asked for the members drawn in the chamber. Until plates land, the lane shows members as faces on the panel (#6830), a stopgap.

**Do.**

1. The art session paints a plate per chamber in the standard camera (`room-spots` skill): `council-chamber`, `council-chamber-small`, `council-chamber-large`, `county-commission`, `county-commission-rural`, `school-board-room`, `state-house-chamber`, `state-legislative-chamber-bicameral` and `state-legislative-chamber-unicameral`. Each plate has a seat per member at the dais (pose and seat as the pack paints them; a `role` on the presiding seat, matched by `seatRoles` in `src/bench/data/whole-figures.json`), a lectern or public-comment spot, and a few audience seats.
2. Light: a plate names one backdrop file. A meeting at night shows the night painting, so either each light gets its own plate, or the plate names several files of the same painting. The second needs one loader change in `src/bench/mannequin-plates.ts` (an optional `backdrops` list beside `backdrop`); the people session makes it when the first plate asks for it.
3. The pack must paint every pose the chamber plates use for every person (dais seats are a desk pose; see `people-pack-v4-pose-gaps`).

**Rules.** One rule, all 56 places: chamber plates are art data read by the one staging engine (`stagePeople`), with no place named in code; Replace, never layer: when a chamber has a plate, the lane's faces-on-the-panel stopgap for that room is removed in the same change; Placeholders: a chamber or light without a plate stays a registered stopgap until painted.

**Done when.** In a drawn place (name it and the seed), a played council or commission meeting draws every member in a dais seat on the chamber's plate, the presiding officer in the kept seat, with no member unplaced as `no-plate`; a screenshot shows it. `people-pack.test.ts` passes, including "fits every plate to a backdrop the game has".

**Files.** `art/people-rooms/mannequin-plates/`, `art/backdrops/manifest.json`, `src/bench/mannequin-plates.ts`, `src/bench/data/whole-figures.json`, `src/bench/people-pack.test.ts`.
