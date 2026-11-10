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
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The opening's last beat at home casts the player and the household, but in some drawn places the home picture draws nobody. src/bench/montage.test.ts fails with "home: expected 0 to be greater than 0" in Brighton, Colorado (0808675, run seed lane4-open-a), Agat, Guam (run seed lane4-open-b:a) and St. Johnsbury, Vermont (5062125, run seed lane4-open-b:b), found by Lane 4 on Nov 4. The likely reason is that the home backdrop had no mannequin plate, so staging placed nobody. Home plates now exist, but the owner ruled on Nov 10 that staging defects wait while busts are coming, so this item holds until he decides how busts are shown. Guards: the montage test on main, and the opening's last beat, which draws an empty home in some towns.

**Cause.** Measured: `src/bench/montage.test.ts` fails on main for the three places and run seeds named above (Brighton, Colorado 0808675, seed lane4-open-a; Agat, Guam, seed lane4-open-b:a; St. Johnsbury, Vermont 5062125, seed lane4-open-b:b). Not traced since Nov 4: whether the home plates in art/people-rooms/mannequin-plates/home.mannequins.json now cover those homes.

**Fix.** After the owner's decision on how busts are shown, make the home beat in src/bench/montage.ts stage the player and household on the home plates in every drawn home, and nothing else. If the decision makes full-body staging unnecessary, drop the item.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Owner, Nov 10 (OWNER-DECISIONS, "Staging waits for busts"): full-body staging defects are not filed or reopened while busts are coming. Replace, never layer: when the home plates are used the beat draws from them and no stand-in drawing is added beside them. Never draw, place or fake a person, which would be a placeholder nobody registered.

**Done when.** A second session (not the builder) runs `src/bench/montage.test.ts` with run seeds lane4-open-a and lane4-open-b in the three places named above and in one more drawn place, and the home beat stages the player and the household in every drawn home; each home picture holds at least the player. A screenshot of the home beat at 1440x900 in each place, with place and seed under it, shows the figures standing where the plate puts them.

**Waits on.** Owner decision: how busts are shown (staging waits for busts, Nov 10, OWNER-DECISIONS).

**Files.** src/bench/montage.ts, src/bench/montage.test.ts, src/bench/scene.ts, art/people-rooms/mannequin-plates/home.mannequins.json

**Notes.** lead: Lane 4. Waits on the people system (unit 8). Found by Lane 4 on Nov 4.
