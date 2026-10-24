---
id: research-gov-bribery-sentences-holder-parties
title: "Bribery sentences use each place's own law; unrecorded officeholders open in their real party"
area: gov
kind: research
priority: 2
size: S
status: done
claimed-by: claude/dreamy-tesla-bgi3ui-gov
pr: #5856
blocked-on:
source: "split Oct 24, 2026 from research-gov-sourced-parameters (PR #5856)"
claimed-at: 2026-10-24T01:40:00.000Z
---

**What.** Source what the justice and officials engines assumed, as far as the public pages the cloud could reach allow. Each place's own `crime:bribery` row in data/research/justice/sentencing-ranges-2026.json (43 places read from the statute) now replaces the assault stand-in in `briberyRange` (src/core2/justice-law.ts), the party of 158 officeholders the rosters left out comes from the new data/research/offices/unrecorded-holder-parties-2026.json (read by `unrecordedParty` in src/core2/modules/officials.ts), and `newsOutletDelayDays` in src/core2/data/news/parameters.json is now ESTIMATED with a spread of 1 to 2 days from the new data/research/news/apnorc-2014-news-frequency.json and data/research/news/pew-2024-2025-news-habits.json. The `replacement` of SG-GOV-justice-bribery-grade, SG-OFFICIALS-unrecorded-party and SG-P15-news-habits is rewritten in src/core2/data/stopgaps.json, and the played-year check is scripts/research/gov-year.ts. Split from research-gov-sourced-parameters, which stays open for the story-life cutoff, stories per contact, the places and seats not read, and all three stopgaps.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome. Estimate, never UNKNOWN: a row with no exact source is ESTIMATED with its source and spread, never invented. One rule, all 56 places: each place's bribery range and each seat's party are rows in data keyed by place, never a state named in logic. Replace, never layer: the assault stand-in for bribery (BRIBERY_STAND_IN_OFFENSE) is deleted from src/core2/justice-law.ts in the same change.

**Done when.** (a) Each of these is SOURCED or ESTIMATED with a citation (publisher, year, URL) and a spread (low, high, unit, citation), or, for a fact of law or record, cites the official page it was read from: newsOutletDelayDays (ESTIMATED, 1 day, spread 1 to 2 days), the bribery range of each of the 43 places read from its statute (data/research/justice/sentencing-ranges-2026.json), and the party of each of the 158 unrecorded holders (data/research/offices/unrecorded-holder-parties-2026.json). (b) Each new or changed file under data/research/ named above has a reader in src/ or scripts/ (not tests or scripts/audit), and tests/guards/research-data-has-reader.test.ts lists none of them. (c) SG-GOV-justice-bribery-grade, SG-OFFICIALS-unrecorded-party and SG-P15-news-habits each keep their row in src/core2/data/stopgaps.json with a `replacement` rewritten to name the sources read and what is left. (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports the news outlet delay band and the word-of-mouth band and where the town landed, with record ids, and names the two reads that year could not exercise (the bribery range and the unrecorded-holder party). (f) scripts/research/gov-year.ts exits 1 when newsOutletDelayDays no longer matches data/research/news/apnorc-2014-news-frequency.json.

**Files.** src/core2/data/news/parameters.json, src/core2/justice-law.ts, src/core2/modules/officials.ts, src/core2/data/stopgaps.json, data/research/justice/sentencing-ranges-2026.json, data/research/news/apnorc-2014-news-frequency.json, data/research/news/pew-2024-2025-news-habits.json, data/research/offices/unrecorded-holder-parties-2026.json, scripts/research/gov-year.ts

**Notes.** Split Oct 24, 2026 from research-gov-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5856 on branch claude/dreamy-tesla-bgi3ui-gov.
