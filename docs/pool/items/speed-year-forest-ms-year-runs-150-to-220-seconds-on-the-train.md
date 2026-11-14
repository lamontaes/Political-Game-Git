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

**Fix.** Bisect the folded pull requests, name the one that added the time, and cut its cost (an index, or act on the day something changed) without changing what it records (skill `speed-work`).

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push the bisect and what is found, set the state honestly with a one-line note, and stop.

**Rules.** Speed (owner, Oct 29): a country's year under two minutes, and no change slows a year more than 20% over its base. One run, one number. Container noise is 10 to 20%, so the bisect compares runs in one container, one process at a time.

**Done when.** A second session, not the builder, runs `npm run speed:year -- --seed b7f4a95c18 --years 3` on main in the drawn place Forest, Mississippi and in one place nobody chose, and each year takes under 120 s, or the item names the pull request that added the time and what it was told to cost.

**Waits on.** Nothing.

**Files.** scripts/speed-years/profile-year.ts
