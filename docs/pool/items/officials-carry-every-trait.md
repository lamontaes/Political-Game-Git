---
id: officials-carry-every-trait
title: "State and federal officials carry a level on every trait in residents' units, not nine faint facets"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** drawOfficial (src/core2/officials-roster.ts:217) gives each state and federal official nine traits drawn in -1..1 with a spread of about 0.35 (src/core2/data/officials/officials.json, traits.keys), and src/core2/modules/officials.ts:717 passes them to fillInIdentity, which then skips the residents' temperament model. Residents carry a level from -2 to 2 on every trait (src/core2/opening-personality.ts: 'a full person carries a level on every trait, low as well as high', OPUS-TRAITS Oct 12). Measured Oct 24 in Layton, New Jersey (3439600, seed 971e14bd6b58): 1,557 calendar-tier adults (the officials) hold 9 traits each and their lean toward any decision spreads 0.45 between thirds, against 1.25 to 1.31 for the town's weekly and monthly people. Officials' personality reaches every decision they make (legislative votes, interviews, appointments) at a third of a resident's size, and 89 of the 98 traits never reach them.

**Rules.** One model, two tiers: an official is a full person read by the same trait table as a resident. Seeded generation of who exists is allowed; no dice decides what they do. The selection effect (Dietrich, Lasley, Mondak, Remmel and Turner 2012: legislators above the public on extraversion and conscientiousness) stays, as a shift in residents' units. Loyalty and ambition keep reading the person's own traits.

**Done when.** In one buildBenchWorld of a drawn place, seed named, every state and federal official holds a level on every trait of data/content/trait-act-pulls.json, their lean's spread between thirds sits within 15% of the town's residents', the legislature tests pass, and a played year shows the party-line vote share inside its existing band.

**Files.** src/core2/officials-roster.ts, src/core2/modules/officials.ts, src/core2/data/officials/officials.json

**Notes.** TODO
