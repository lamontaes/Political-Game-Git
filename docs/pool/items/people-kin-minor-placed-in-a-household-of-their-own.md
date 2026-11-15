---
id: people-kin-minor-placed-in-a-household-of-their-own
title: "The opening places some relatives aged 13 to 17 in a household of their own, with no adult, outside the town"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: rc1-world-outside-town
lead: money
model: sonnet
effort: medium
source: "found by T54 building world-kin-households-open-with-no-cash (#9465), Nov 15"
---

**What.** A few of the relatives the opening places around the town are teenagers living alone: a household of one 13 to 17 year old, with no adult, in a county place. Nobody pays their rent or keeps them, and the opening's cash rule gives a household with no adult nothing, so they open with $0 and a living cost. A real 15 year old lives with a parent, a grandparent or another guardian. Seen: in dev mode, the county's counted households list a household whose only member is under 18.

**Cause.** Measured: at Bastrop, Louisiana (place 2204685, the seed `drawPlace("c3", "home-price-paths")` gives, world seed 452a3c32cb1dec08db7647f6288fecab595bf56002a3112926e035d4f043a7c0), `buildPopulation` on the Train at 3b168daf writes 5 of 21,802 relatives' households with no member aged 18 or over: household_1fd94eeff1fb8e8a (one person, 15), household_b8c719c933c72ba5 (17), household_dec302787736f417 (16), household_9fd9de46e41e6b56 (16) and household_9fd9e146e41e706f (13). Their family links name a parent who is a named record of the opening, not a member of their household. `buildOpeningKin` in src/core2/opening-kin.ts forms each relative's household; which step leaves a minor alone is not yet traced.

**Fix.** Needs cause. First step: at the seed above, follow person_129566aa93583898 through `buildOpeningKin` and find where a child is given a household without the adult it belongs with; a minor joins that adult's household instead.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, write what was read here and stop.

**Rules.** One rule, all 56 places. Wire to the world: a minor's household has an adult who pays its costs. No dice: who a child lives with comes from the family's records.

**Done when.** A test pinned at Bastrop with the seed above shows no relatives' household without an adult in the opening, by household id, and a second session finds none in a drawn place it names with its seed.

**Waits on.** Nothing.

**Files.** src/core2/opening-kin.ts
