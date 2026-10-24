---
id: play-school-names-abbreviated
title: "Who you are shows school names cut to their record abbreviations ('Shamokin Area Intermediate Sch', 'El Sch')"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the bench on main, Dalmatia, Pennsylvania (place key 4218080, seed d5a7f4797e3756f8bdd69464f234cc3c2e3a0e91d0ef4b01ef56cfde097588e6), Who you are lists the player's schools as 'Shamokin Area Intermediate Sch' and 'Shamokin Area El Sch'. Those are the school data's abbreviations, shown as they are stored.

**Rules.** No hand-written player text: expand the abbreviations in the data or the English engine, never by typing names into a screen.

**Done when.** Who you are in Dalmatia, Pennsylvania (seed above) shows 'Shamokin Area Intermediate School' and 'Shamokin Area Elementary School', with a screenshot in the PR body.

**Files.** src/bench/play.mjs, src/core2/data

**Notes.** TODO
