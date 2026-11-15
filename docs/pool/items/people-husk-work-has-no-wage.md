---
id: people-husk-work-has-no-wage
title: "A relative who lives elsewhere and works holds a wage, so what they would give up can be weighed"
area: people
kind: feature
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after: people-far-fill-in-holds-home-work
blocked-on:
lead: people
source: "Civic roles builder, Nov 15, building people-far-fill-in-holds-home-work"
model: sonnet
effort: medium
---

**What.** A relative or town leaver living elsewhere works by the jobs-elsewhere review (employed, looking, out, retired) with no title or wage kept, so workHeld finds nothing for them. A person filled in elsewhere by any other path already holds such work. Seen: their card's work line and any ask that weighs their pay.

**Cause.** Found in code: `reviewWorkElsewhere` in src/core2/jobs-elsewhere.ts (line 361) keeps a WorkRow with a status only (SG-LIVES-work-no-employer); src/core2/person-work.ts workHeld reads an open job or the identity:work record.

**Fix.** When the jobs-elsewhere review starts a spell of work, keep the work their home town's counts show (workFromHome in src/core2/coarse-place.ts) as their identity:work record, and end it when the spell ends.

**Time box.** 2 hours for one session.

**Rules.** No dice: the pull is a sliding scale on the person's own record. One model, two tiers.

**Done when.** A second session opens a relative who lives elsewhere and works, in a drawn place named with its seed, and sees their work and pay on their card.

**Waits on.** people-far-fill-in-holds-home-work.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/coarse-place.ts, src/core2/person-work.ts

**Notes.** Filed by hand by the civic roles builder.
