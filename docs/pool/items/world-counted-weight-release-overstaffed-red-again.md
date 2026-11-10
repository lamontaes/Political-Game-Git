---
id: world-counted-weight-release-overstaffed-red-again
title: "counted-weight-release red on main again: at Census size employers stand far over their sales staff (Washington, D.C., seed dc-closures-a; Wichita, Kansas)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: red-main
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
---

**What.** src/core2/counted-weight-release.test.ts fails on clean main (fa97c57fc5, Oct 29 02:20 UTC) in both cases. Washington, D.C. (1150000), fixed seed dc-closures-a: the most overstaffed employer at the Census size reads organization_df6c54e881a57ad2 50.4 staff against 12.1 its sales support (organization_4905e57ad6bcc4a1 910.1/223.2), against at most 70.0/50.6 at the sample size, so the worst ratio is about 4.17 where the test allows a tenth over the sample town's. Wichita, Kansas (2079000), base 0930f1635339f81e, fails the same way (organization_7c0d28c77eedc627 1321.3/323.1). The items world-counted-weight-release-grows-employer-staff (#5866) and world-census-scale-closures-large-cities (#5803) are done; this is their test turning red again. Found by the laws session.

**Cause.** Measured: src/core2/counted-weight-release.test.ts on main fa97c57fc5, Washington, D.C. place 1150000 seed dc-closures-a (worst ratio about 4.17) and Wichita, Kansas place 2079000 base 0930f1635339f81e. The main commit that moved the ratio is not yet named.

**Fix.** Find the main commit that moved the ratio, by file and line, and restore staff following sales at Census size in src/core2/modules/residents.ts or src/core2/modules/jobs.ts; never loosen the test.

**Time box.** 4 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a fill-in moves no employer's heads and an employer's counted staff follows its sales, never a fixed share. One model, two tiers: a counted group's staffing follows the same rule as a full employer's, times its count. No dice. Red main comes first.

**Done when.** A second session (not the builder) runs src/core2/counted-weight-release.test.ts on main and sees it pass in both cases (the fixed D.C. seed dc-closures-a and a drawn city above 100,000, named in the PR body), and reads in the PR body the commit on main that moved the ratio and why, by file and line.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight-release.test.ts, src/core2/modules/residents.ts, src/core2/modules/jobs.ts

**Notes.** TODO
