---
id: play-opening-home-beat-draws-nobody
title: "The opening's last beat at home draws nobody in some towns"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/montage.test.ts fails on clean main (origin/main, Nov 4) for drawn places whose home picture draws nobody: 'home: expected 0 to be greater than 0' in Brighton, Colorado (0808675, run seed lane4-open-a), Agat, Guam (run seed lane4-open-b:a) and St. Johnsbury, Vermont (5062125, lane4-open-b:b). The home beat casts the player and household, but stagePeople places nobody, likely because the home backdrop has no mannequin plate.

**Rules.** Owner, Nov 4: no people work tonight; this waits on the people system (unit 8: people-home-plates). Never draw, place or fake a person.

**Done when.** montage.test.ts passes with run seeds lane4-open-a and lane4-open-b: the home beat stages the player and household in every drawn home.

**Files.** src/bench/montage.ts, src/bench/scene.ts, art/people-rooms/mannequin-plates

**Notes.** lead: Lane 4. Waits on the people system (unit 8). Found by Lane 4 on Nov 4.
