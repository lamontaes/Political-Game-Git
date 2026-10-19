---
id: core-opening-counts-from-census
title: "County and state counted population at the opening come straight from the census"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: "owner ruling Oct 19; PR #5039's question"
---

**What.** The county and state counted population at the opening are generated straight from the census tables for the place, varying per world by seed, not seeded from residents' relatives. Owner, Oct 19: "Straight from the census. It'll be variable again; it just depends on the simulation." The relatives path is removed, not kept beside the new one (replace, never layer), and the opening gets faster because the counted tiers no longer walk every resident's kin. Residents still have relatives; the relatives are no longer what the county and state counts are built from.

**Rules.** One model, two tiers: counted groups match the census for the place at the coarser tier, by the same rule the town's own people follow. Seeded generation of who exists is allowed; nothing after day one is a draw, so the seed sets the counts and the year never redraws them.

**Done when.** A drawn place opens with county and state counts that match its census tables within the stated spread, two seeds of the same place differ in their counts, the opening time is measured before and after on the same base and reported in the PR, and a test names the place and seed and asserts the match. The owner plays it: the county and state around the town are the size the census says, and a new game is not the same as the last.

**Files.** Find the opening population builder: grep `relatives` in src/core2/opening*.ts or src/core2/town-*.ts and name the real path in the PR.

**Notes.** PR #5039 asked whether the counted tiers should be seeded from relatives; the owner answered from the census. Ruling in OWNER-DECISIONS.md, Oct 19.
