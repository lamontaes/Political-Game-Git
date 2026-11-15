---
id: jobs-4-chains-owned-by-people-in-the-simulation
title: "Every business is owned by people in the simulation, chains included, and the outside owner account is deleted"
area: core
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after: jobs-3-business-names-fit-their-kind
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 20:44Z and 20:48Z (jobs read as textiles or markets; chains in sectors), 21:00Z (the point is that laws reach businesses by sector; not finely detailed, the effect web must play out); Account lead's five-piece plan, Nov 15 20:59Z; trace by T54 at /mnt/project-files/account-lead/t54-jobs-trace.md"
---

**What.** Owner, Nov 15 20:48Z: chains "of grocery stores or pharmaceutical companies" owned by people in the game (his "Jeff's Club" and "Jeff Brown" were a made-up example, 21:00Z, nothing is built around that name). Today a share of the largest businesses belong to a firm based outside the town whose parent is the place's outside account, not a person, and no world opens with a chain (trace: /mnt/project-files/account-lead/t54-jobs-trace.md). A chain's profits never reach anyone a law or a campaign can touch. Seen: a business card's owner line and dev mode's Trace of a business's owner draw.

**Rulings (OWNER-DECISIONS.md on Train 29ef4685).** Line 914: "Business and roles database: ... chains and tycoons emerge, no scripted chains, no real brands." Line 939: "Businesses are generated with real-sounding names. Not 'general store' ... and not real brands: generated chains and local names, with real people in them." Line 897: press outlets' owners are wealthy people. Line 912: starting or buying a business is 1.0; an owner sees the books. Line 661 and DECISION-REGISTER line 135: businesses fit each town from calibrated tables. No ruling names who owns a firm based elsewhere; the lead's rule below applies.

**Cause.** Found in code: opening owners are each business's highest-paid worker (stopgap SG-WORLD-business-opening-owners); multi-establishment businesses are parented to the outside account (src/core2/opening-outside-market.ts, `outsideFlow` read in 33 files). The business engine can already open a location of an existing business elsewhere (`parentId`, src/core2/modules/business.ts:2077), so chains grow in play but none exist on day one.

**Fix.** Every business has an owner who is a person (or people) in the simulation; an owner who lives elsewhere is a person of that other place, held the way other places are (from counts, filled in on demand), and the stand-in outside account is deleted when that lands. On day one, the multi-establishment share is built by running the same founding-a-location path the engine uses in play over the warm-up, not a hand list; a chain's parent is a business owned by a person of its home place; profits and draws reach that person's cash and taxes. The outside account's other jobs (goods that leave town) stay where a ruling put them (line 917) and are separated first.

**Laws that reach it.** Owner income and its taxes (state income tax rows), the owner's donations and stances on the laws that cost their businesses (views read money), and any law on a kind (piece 2) now reaches a named person's books.

**Time box.** 8 hours in two pull requests (owners as people; then the opening chains), Opus, medium.

**Rules.** Day one in motion; two-level population; no dice; one engine; replace, never layer.

**Done when.** At three named places with seeds: every business's owner resolves to a person record (full or counted, filled on click); at least one chain location is owned through a parent in another place, followed to the owner's cash by record id; no organization's parent is the outside account; a second session sees, in dev mode at a drawn place it names with its seed, a chain store's owner as a person with a card; year-1 time per record with and without.

**Waits on.** Piece 3 for names; the lead's one-line owner question if any remains.

**Files.** src/core2/opening-outside-market.ts, src/core2/modules/business.ts, src/core2/opening-customers.ts, the stopgap family file.
