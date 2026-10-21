---
id: owner-unemployment-work-search
title: "Should a claimant's unemployment benefit depend on weekly work-search contacts, or should the state work-search rule stay recorded law with no player-facing step?"
area: gov
kind: owner-decision
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on: owner decision
source: added with npm run pool -- add
---

**What.** State unemployment law rows carry `workSearchContactsPerWeek` (1 to 4 contacts a week, sourced in `starting-law.json`), and no engine reads it. The question is whether a claimant's benefit should depend on it. If yes, the simplest honest build counts a claimant's contacts as the openings they apply to, which needs searching that is not tied to a posted position first (`world-hires-below-jolts`), and pays a week on a sliding scale of contacts against the requirement. If no, the field stays as recorded law data.

**Rules.** "This is a game, not a spreadsheet": logging contacts is a real-world step the golden path, The Political Process baseline and the owner have not asked for; neither the decision register nor OWNER-DECISIONS.md rules on it (searched Oct 19).

**Done when.** The owner answers in one line; then the work-search item is built to that answer, or the field is marked recorded law only in the guard test that lists unread law fields.

**Files.** src/core2/jobs-benefits.ts, src/core2/data/laws/starting-law.json

**Notes.** Raised by claude/political-game-pool-3xfqef-2 on Oct 19 while taking `world-unemployment-work-search`, which three earlier sessions also left unbuilt for this reason.
