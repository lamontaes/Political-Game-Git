---
id: wire-law-links-to-people
title: "Every law link reaches a named person: the effect web's stopgapped links and the matrix's partly-wired laws, one PR each, proven by the twin-world checker"
area: laws
kind: feature
priority: 1
size: L
status: in-pr
claimed-by: laws/wire-law-links
pr: #6760
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T14:40:59.335Z
---

**What.** The effect web (docs/reports/effect-web-matrix-2026-10-20.json, scripts/outcome-web/effect-matrix.ts) has 244 links: 139 reach the world, 118 are named in a stopgap, 0 unreached without a stopgap. The law matrix (docs/reports/law-wiring-matrix.json, scripts/law-wiring/matrix.ts) has 68 of 89 laws wired, 7 partly, 14 on a stopgap. One PR per link or law, the oldest stopgap first: the law in force changes, the engine that pays or decides reads it, a named person's money or view moves, proven by scripts/law-wiring/check.ts in two drawn places. Each PR regenerates the matrix. No new mechanic: a link whose reader does not exist is a stopgap naming the engine. Time box: 8 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards: two-seeds-differ, no-second-source, no-dice. An effect is a read, not a record; ask why by record; nobody attributes a change to a law unless they learned of it.

**Done when.** The regenerated matrices show wired up and stopgapped down by the PRs' counts, each PR naming the link, the place, the seed and the record ids from the checker; no link reaches the world through a second path.

**Files.** src/core2/law-reach/,src/core2/modules/laws.ts,data/research/outcome-web/links.json,scripts/law-wiring/,scripts/outcome-web/,docs/reports/law-wiring-matrix.json

**Notes.** Filed by the CTO on the owner's go (Oct 28): the laws-and-effects lead's matrix work resumes under the guards. engine: laws.ts, law-reach/host.ts. guard: two-seeds-differ, no-second-source. Read: OWNER-DECISIONS, docs/work-orders/lead-laws-effects-2026-10-26.md, the laws-and-effects channel blocks. Starts now. Oct 28, 10:10 UTC (laws-and-effects lead): laws wired 68 to 70 of 89, links reaching the world 139 to 143 of 244, by #6552 (groundwater), #6567 (farmland), #6573 (four election laws, restore-voting wired) and #6577 (two housing links); every link an engine read its own way beside the web is now carried by that engine at the research's size. Left, each on its stopgap and needing an engine the game lacks: parks (free time), SNAP and grocery exemption (food security), three fiscal laws (state and local borrowing), higher education (college completion), Medicaid and cannabis (medical debt, teen use records), immigration enforcement (legal status), the loan cap (small-dollar lenders), natural resources and age verification (no researched link). Set back to open. Oct 28, 10:10 UTC (laws-and-effects lead): laws wired 68 to 70 of 89, links reaching the world 139 to 143 of 244, by #6552 (groundwater), #6567 (farmland), #6573 (four election laws, restore-voting wired) and #6577 (two housing links); every link an engine read its own way beside the web is now carried by that engine at the research's size. Left, each on its stopgap and needing an engine the game lacks: parks (free time), SNAP and grocery exemption (food security), three fiscal laws (state and local borrowing), higher education (college completion), Medicaid and cannabis (medical debt, teen use records), immigration enforcement (legal status), the loan cap (small-dollar lenders), natural resources and age verification (no researched link). Set back to open.

Oct 29 14:40 UTC (laws session): set back to in-pr. The flip job marked the item done when #6757 (a matrix regeneration) merged with this id on its first line; it is not done: 83 of 89 laws are wired (the six left wait on the owner question of Oct 28 22:30) and links reach 162 of 244. Family PRs now open with "Touches pool item: wire-law-links-to-people" so a merge flips nothing; open: #6760 (labor), #6761 (a jobs web test fix), the civic family next.
