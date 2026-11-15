---
id: jobs-2b-retail-shares-from-county-business-patterns-detail
title: "Replace the estimated store-kind shares with the County Business Patterns detail file"
area: core
kind: research
priority: 3
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

**What.** Piece 2's shares of grocery, fuel station and other retail by place size are ESTIMATED from memory. They size every town's stores, so the error spreads to all 56 places. Feeds: jobs-2-retail-and-food-split-where-laws-tell-them-apart.

**Cause.** Found in code: `load` in scripts/source/regional-money/export-town-employment.ts:69 reads `data/source/county-business-patterns/regional-corpus.json.gz`, which keeps two-digit NAICS only. The compiler that built it from the raw County Business Patterns 2023 county file (every NAICS level, never committed) was deleted as unused in 595b46a9d3, so a finer extract needs a compiler again (trace: /mnt/project-files/account-lead/t54-jobs-trace.md).

**Fix.** Where the network allows census.gov, fetch the CBP 2023 county file, write the compiler back as one committed script that keeps NAICS 445 (food and beverage stores), 447/457 (gasoline stations) and the rest of 44-45, rebuild the corpus and the generated town mix with the committed script, and turn piece 2's rows SOURCED. Never hand-edit the generated file.

**Time box.** 2 hours, Sonnet, medium. Containers that cannot reach census.gov stop and say so.

**Rules.** Research calibrates, never decides one outcome. Generated files are rebuilt by their script.

**Done when.** The rows are SOURCED with the file and its date; the rebuilt mix at three named places is in the pull request. A second session sees, in dev mode at a drawn place it names with its seed, the store kinds' counts beside the county's published counts.

**Waits on.** Piece 2; a container that can reach census.gov.

**Files.** scripts/source/regional-money (its compiler and export script), src/core2/reference/town-employment.generated.ts.

**Notes.** T54, Nov 15: `data/tables/local-business-counts.json` already holds County Business Patterns 2023 four-digit counts by county (establishments and employees) for grocery, hardware, diner, auto repair, law office, accounting, construction and salon. Read it first: grocery may need no fetch, and only fuel stations would.
