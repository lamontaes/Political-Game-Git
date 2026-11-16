---
id: press-outlet-owner-dies-leaves-the-paper-with-a-dead-owner
title: "A paper whose owner dies keeps the dead owner as its owner, and its organization has none"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: found by the Account lead while reading a day-zero true zero, Nov 15
claimed-at:
---

**What.** An outlet's owner can die and nothing replaces them. At the day-zero pinned place Lewiston, Maine (place 2338740, world seed 23142a2761a6…, 2025-01-20, 31-day warm-up) the national online outlet `outlet:online:0:national` has `ownerId` `person:press:outlet:online:0:national:owner:0`, who died on 2024-12-23 (`life.death:person:press:outlet:online:0:national:owner:0:2024-12-23`); forty days later the outlet still names the dead owner and `ownerOf` of its organization `organization:press:online:0:national` returns nobody. The owner's views and ties are read into the outlet's lean and slant and into who the paper owes regard to, so a dead person's view weighs on every story. Seen: the way the paper slants a story about an official or a race on the News page, which weighs a dead owner's lean (about line 1014) and regard for the official (about line 2915) in `press.ts`; no screen shows the owner's name in the sources I read, so the builder lists where a name shows.

**Cause.** Measured: in Lewiston, Maine (place 2338740, seed 23142a2761a616b9618e425db3c9591cc9cba0aaf1f83ab37d888944e039ab3b), on the Train at c43bf7e0, `buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "2338740", warmUpDays: OPENING_WARMUP_DAYS })`, then `healthReport` and the press `outlets` table with `warmUpDays: OPENING_WARMUP_DAYS`, then 40 more days: outlets 13, the one with a dead owner is the national online outlet and no outlet has no owner. `ownerId` is written once, at hire (src/core2/modules/press.ts, the `hire(ownerRole…)` at about line 967) and read at about lines 1014, 2011, 2915 and 3997; line 3997 reads `ownerOf(api, outlet.organizationId) ?? outlet.ownerId`, so the organization's owner would win if the business engine passed the paper to an heir, and here it has none.

**Fix.** Make `outlet.ownerId` follow the organization's owner (`ownerOf`) at every read in src/core2/modules/press.ts instead of the id written at hire, and let the estate engine's business settlement (`world-estate-settles-loans-and-businesses`) pass the organization to an heir or sell it, the same path any dead owner's business takes. No second succession mechanism for papers. A paper no one can own closes by the shortfall rule already there (`press-outlet-shortfall-closes-paper`).

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted or husk owner is read by the same rule as a full one. The chain is the acceptance: the death record, the estate settlement row, the organization's new owner, the outlet's lean and the news a person reads. One rule, all 56 places: no place named in logic.

**Done when.** A second session (not the builder) builds a world at a drawn place and seed it names, kills a paper's owner in the game's own way (dev mode death) and sees, by record id, the organization's owner change or the paper close, and the outlet's lean read the new owner; at Lewiston above, the national online outlet has a living owner on day one.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/estates.ts

**Notes.** Found alongside the Education Secretary who also died in the same window: the federal cabinet post was refilled on 2025-01-19 by `refillCabinet` (src/core2/modules/succession.ts), so appointed posts do open on death; only the paper's owner has no such path.
