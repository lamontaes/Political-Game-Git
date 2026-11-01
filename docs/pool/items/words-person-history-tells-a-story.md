---
id: words-person-history-tells-a-story
title: "A person's card tells their life as a story with more than a title under the name, and its office dates agree"
area: words
kind: bug
priority: 1
size: M
status: claimed
claimed-by: words/person-history-story
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: words
milestone: play-first
claimed-at: 2026-11-01T22:42:18.263Z
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Angela Moseley's card: "Also, the people's histories are still terrible. Elected legislator, it needs to be told like a story. How many times do I have to say that? And I don't like just the top part. Under her name, she told legislator. That's not good. There needs to be more text." The History tab reads "1990 Born.", "2001 Started middle school.", "2004 Started high school.", then "Elected legislator." three times (2011, 2013, 2015), and the header says only "Seat held: Legislator, Since 2025", which contradicts the elections it lists. The card should read like a short biography from the same records: where she grew up, what she studied and did for work, how she came to run, each race told with its office, district and how it went, and a line or two under the name that say who she is now.

**Rules.** No hand-written player text: every sentence comes from the person-history bank and cites its record. Ask why: the header's since date and the elections list read the same seat records, so they cannot disagree. This is a game, not a spreadsheet: a life reads as a story, never a log of field lines.

**Done when.** In three drawn places (named with seeds), the cards of an official, a resident and the player each read as connected sentences from their records (quoted in the PR before and after), the header shows at least two lines under the name, a repeated office is told once with its terms, and a test fails when the header's since date and the first election disagree.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Opening someone's card reads like a short biography, and the line under their name says who they are, not just one word.

**Screenshot.** Angela Moseley's card (or a drawn place's official) before and after.

**Files.** data/english/parts/person-history.json, src/bench/play.mjs, src/bench/person-card.browser.mjs

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.
