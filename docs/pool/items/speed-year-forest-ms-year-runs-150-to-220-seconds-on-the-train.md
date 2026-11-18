---
id: speed-year-forest-ms-year-runs-150-to-220-seconds-on-the-train
title: "A year in Forest, Mississippi takes 151 to 221 seconds on the train, up from 99 to 144 seconds on the earlier train head"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
source: "Account lead F1, Nov 14, 2026, timing #9254 against the train"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** One played year in Forest, Mississippi (2825340, seed b7f4a95c18) takes far longer on the train than it did a few hours earlier on an older head, against the owner's bar of two minutes a country's year (Oct 29). A player in this town waits two to three minutes a year, and the delay grew between two train heads. Seen: the dev-mode date-advance call for this town, and `npm run speed:year -- --seed b7f4a95c18 --years 3`.

**Cause.** Measured: same seed, same container, three years: train head 532d9303920eeb76718cc3a1e454414a8307fc88 took 98.7, 106.5 and 144.0 s (386,920, 576,198 and 637,814 records); train head 214e6a6eb88f71a127788a363ba078d6f3a6ef2b took 151.6, 180.2 and 221.2 s (409,735, 615,297 and 651,919 records). Seconds per 100k records went from 25.5, 18.5 and 22.6 to 37.0, 29.3 and 33.9, so the cost per record rose about 45% while records rose 6%. Not yet found: which folded pull request between the two heads added the time; bisect the train's fold commits between 532d9303 and 214e6a6e with one year each, then profile the first slow head with scripts/speed-years/profile-year.ts by function.

**More evidence (day-one warm-up measurement, Nov 15, train head 2190669e, one process at a time, two runs each).** One unattended year from a new game, seconds and milliseconds per 1,000 records at the end of the year: Lewiston ME 208 and 198 s (503,859 records; 414 and 392 ms per 1,000) without the warm-up, 200 and 209 s (511,985; 391 and 408) with it; Washington DC 172 and 161 s (433,239; 398 and 372) without, 161 and 155 s (446,120; 360 and 348) with; Myton UT 54 and 55 s (258,674; 210 and 213) without, 52 and 51 s (262,862; 196 and 195) with. Lewiston and Washington are over the two-minute bar with or without the warm-up, so the slowness is in the train, not the warm-up.

**Fix.** Bisect the folded pull requests, name the one that added the time, and cut its cost (an index, or act on the day something changed) without changing what it records (skill `speed-work`).

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push the bisect and what is found, set the state honestly with a one-line note, and stop.

**Rules.** Speed (owner, Oct 29): a country's year under two minutes, and no change slows a year more than 20% over its base. One run, one number. Container noise is 10 to 20%, so the bisect compares runs in one container, one process at a time.

**Done when.** A second session, not the builder, runs `npm run speed:year -- --seed b7f4a95c18 --years 3` on main in the drawn place Forest, Mississippi and in one place nobody chose, and each year takes under 120 s, or the item names the pull request that added the time and what it was told to cost.

**Waits on.** Nothing.

**Files.** scripts/speed-years/profile-year.ts

**Evidence, Nov 15 (people-shared-time-grows-ties, PR #9364).** One played year at Sheridan, WY (5669845, seed a1), measured on the train at 2190669e with and without that PR: 187.2 and 186.5 s without, 175.2 and 191.3 s with, then 175.2 and 180.0 s without and 179.9 and 179.0 s with on a quiet machine. Arkadelphia, AR ran 244.5 and 253.9 s without; Astoria, OR 205.0 and 187.7 s. All are over the two-minute year bar on the train itself, with or without the ties change.

**Notes.**

- Nov 15, 2026, account lead laws thread: a second town is over the bar on the train. Hartsville, South Carolina (4532560, seed credit-b), `npm run speed:year -- --seed credit-b --years 1 --exclusive` on train head 2190669eda61e1e3f8734d0ca237a40860093edb took 127.0 and 137.4 s, and with #9349's change on top 130.5 and 130.8 s (415,526 records each time; most in law-effects applied 37,714, counted coverage 29,100 and medical bills 21,642). That is about 31 s per 100k records, the same cost per record as Forest's slow head, so it is likely the same cause; the bisect should time this seed too.
- Nov 16, 2026, special-elections thread (PR for gov-opening-terms-end-before-the-start-date, #9615): year 1 on the train at ef708196, `npm run speed:year -- --place <key> --seed <seed> --years 1 --exclusive`, two runs each side, alternated. Washington, DC (1150000, seed 122fae98...): 161.3 and 161.7 s before the change, 161.9 and 170.5 s with it (496,773 and 496,774 records); Lewiston, Maine (2338740, seed 23142a27...): 177.2 and 173.8 s before, 178.6 and 173.9 s with (537,078 and 537,079 records); a small town (5522550, seed opening-year-3): 68.6 and 67.0 s before, 69.4 and 67.5 s with. Both large places are over the two-minute bar with or without the change.
