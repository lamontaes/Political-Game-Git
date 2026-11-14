---
id: words-no-figure-flags-a-tax-rate-policy-name
title: "No-figure rule lists President talk that names a tax rate as a policy, not a figure"
area: gov
lead: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, words:composed --check at Westpoint TN
claimed-at:
standard: 2
model: opus
effort: medium
root: none
---

**What.** `npm run words:composed -- --check` lists two spoken lines at Westpoint, Tennessee (seed 9fee231e-a47b-42a9-ad67-7a6e2198f987, talk:home) under `no-figure-in-composed-talk`: "The President spoke against a higher top income tax rate. Makes sense. Where do you come down on that?" and "The President blocked a higher top income tax rate. I agree. What do you make of it?". Neither line quotes a number. Seen: the two lines in the check's output at that place and seed.

**Cause.** Measured: with `npm run words:composed -- --check` at the place and seed above, the only pattern in `no-figure-in-talk` (data/english/line-rules.json) that matches both lines is the one that lists `tax rate` among `crime|poverty|unemployment|jobless|inflation|interest|tax|mortgage|vacancy|graduation|turnout rate`, so the rule reads the policy's name ("a higher top income tax rate", the question's spoken name) as a statistic. Whether the rule or the name should change is the Words lead's call, since the owner's rule is that people never say the figure.

**Fix.** None until the Words lead rules which side moves: either the rule stops matching `tax rate` when it names a policy and no number or percent is near, or the question's spoken name for this law is worded without "rate". The rule's own list of patterns stays one list for bank lines and composed texts.

**Time box.** 1 hour for one opus session after the ruling.

**Rules.** Words traps: a line is never changed only to pass a guard; the rule is not loosened without the Words lead's ruling.

**Done when.** In a drawn place run (Westpoint, Tennessee, the seed above) `npm run words:composed -- --check` lists neither line, and a played check shows a line that does quote a rate or percent is still listed; the Words lead's ruling is cited, and a second session sees the check in the running game at a drawn place.

**Waits on.** The Words lead's ruling.

**Files.** data/english/line-rules.json, src/english/composed-checks.ts

**Notes.** Filed by hand at the coordinator's ask; no existing item held these lines (searched docs/pool/items for no-figure-in-composed-talk).
