---
id: gov-redistricting-after-census
title: "Redistricting after the game's own census, drawn by the body the law names"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "laws-family-government-operations; stopgap SG-GOV-REACH-A-redistricting; spec docs/codex/specs/bank/b16-redistricting-vra.md"
---

**What.** The game counts its own people in years ending in 0, shifts House seats from those counts, and redraws council wards, state legislative districts and House districts the way each state's law says (legislature, commission or council). Independent-redistricting is then read through `lawInForce`, not written as records on legislators. Courts hear a challenge from affected residents. The full design is the b16 spec.

**Rules.** Owner decisions: DECISION-REGISTER Sept 28 item 8 (neighborhood make-up from Census counts, never a label on a person) and D-6. No dice; one rule, all 56 places; no race field on a person; no second legislative path or court engine; maps drawn only on census years or when a law or ruling requires it.

**Done when.** The b16 "Done when" list: a watched 30-year run in a random place shows the census, a seat gained or lost from the game's own counts, the body the law names choosing among plans with recorded reasons, a challenge by named residents, and SG-GOV-REACH-A-redistricting resolved.

**Files.** New engine module over the existing legislature and offices modules; src/core2/data/laws/reach-group-a.json.

**Notes.** L: split into bounded sub-items (census count; plan builder; who draws; courts; screen) before building. Do not start before the golden path with the world running; a game opened in 2026 holds no census until 2030.
