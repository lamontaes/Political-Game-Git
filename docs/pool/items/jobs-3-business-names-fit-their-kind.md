---
id: jobs-3-business-names-fit-their-kind
title: "Business names fit their kind, place and owner, by rule"
area: core
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: jobs-2-retail-and-food-split-where-laws-tell-them-apart
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "owner, Nov 15 20:44Z and 20:48Z (jobs read as textiles or markets; chains in sectors), 21:00Z (the point is that laws reach businesses by sector; not finely detailed, the effect web must play out); Account lead's five-piece plan, Nov 15 20:59Z; trace by T54 at /mnt/project-files/account-lead/t54-jobs-trace.md"
---

**What.** Every store is "{family}'s Market", "{family} Foods", "{town} Market" or "{family} Mart", and every restaurant "{family}'s Kitchen" (trace: /mnt/project-files/account-lead/t54-jobs-trace.md). A hardware store, a diner and a gas station cannot be told apart by name. Owner, Nov 15 20:44Z: jobs and employers "all read as textiles or markets". Seen: Travel, person cards, the paper's stories and the openings screen.

**Cause.** Found in code: src/core2/data/business/names.json has one template set per business kind, read by `businessName` in the opening builder, and retail and food service are one kind each.

**Fix.** One name rule set per kind from piece 2 (grocery, fuel station, other retail with its line of goods, restaurant styles such as diner, grill, cafe, pizzeria), built from the owner's family name, the town, the county or a place feature in the records, invented, never a real brand (owner, Oct 14: "generated chains and local names, with real people in them"; no "general store"). Rules are data rows in names.json; the picker stays the one that exists. A location of a chain carries its parent's name (piece 4).

**Laws that reach it.** None; names make the kinds that laws reach recognizable on Travel, cards and the paper.

**Time box.** 2 hours, Sonnet, medium.

**Rules.** Player-screen-text: every name a player sees is worded from the bank rows, never an id or kind. American English everywhere: names use what Americans call the place.

**Done when.** At three named places, every business name on Travel and the openings screen reads as its kind, listed in the pull request; a second session sees the names on Travel at a drawn place it names with its seed; the guard on real brands (if none, a test against a short list of national brand words) passes.

**Waits on.** Piece 2.

**Files.** src/core2/data/business/names.json and its reader.
