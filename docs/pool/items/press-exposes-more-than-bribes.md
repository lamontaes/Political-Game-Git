---
id: press-exposes-more-than-bribes
title: "The press exposes more than a taken bribe: a conflict of interest, a misused city card, a residency question"
area: gov
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/press-exposes-conflicts
pr: #6363
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web press pass (packet the-story-breaks)"
lead: laws-effects
milestone: play-first
claimed-at: 2026-10-27T14:44:28.029Z
---

**What.** `press.exposed` is written only for a taken bribe (`src/core2/modules/press.ts`, fact `bribe-taken`). So the scandal scene, its lines and the household's part can fire for one kind of story only. The packet `docs/design/scenes/from-life/the-story-breaks.md` (local cases in four cities, calibration only) shows the common ones. An official voted on a contract their family profits from. A city card paid for personal charges. An official doesn't live in the district they represent. There is also no record that the reporter asked for comment before printing.

**Rules.** No dice: a story is exposed from the records that hold the misconduct (a vote with a family-owned party, a charge against the official's account, a home address outside the district), when a reporter's beat reaches them, never a chance. Wire to the world: the exposure is read by voters' views and the next election (`web-civic-scandal-played-witness`).

**Done when.** In a buildBenchWorld drawn place (seed named), at least one of the three misconduct records above exists in a played year. When the press reaches it, `press.exposed` is written citing that record. The scandal scene stages for the official, citing it by id. A test fails when the misconduct record exists, is reached, and nothing is exposed.

**Time box.** 4 hours.

**You will see.** A reporter's call about a contract your brother-in-law's company won while you voted on it.

**Screenshot.** The scandal call in the bench, with place and seed.

**Files.** src/core2/modules/press.ts

**Notes.** The scandal's lines on the words lead's branch (`words/web-press`) now include an apology, an explanation and an attack on the story.
