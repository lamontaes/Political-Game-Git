---
id: words-measure-result-news-names-the-place
title: "News of another state's ballot measure names the state: measure-result pieces get a place slot and the early return is deleted"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: rc1-world-outside-town
source: stand-in triage of nation.json, Nov 10, 2026 (SG-NATION-outside-measure-news-unworded)
---

**What.** When voters in another state pass a ballot measure, the press skips the result itself, because the measure-result news pieces have no place in them and would read as local news. The law it enacts is reported, but not the vote. Give the pieces a place and print the result.

**Cause.** Found in code: src/core2/press-topics.ts:147 returns null for a "ballot-measure-result" event whose place starts with "national:". The pieces `news.measure-result.*` in data/english/parts/news.json (line 7473 on) use {purpose} and {percent} and no {place}. Design: the owner's no-hand-written-text rule (scene-standard); the words come from the banks.

**Fix.** In data/english/parts/news.json add measure-result pieces that use {place} (a "Voters in {place} approved {purpose}" lede and a percent variant), graded by the civic-prose process; give the press topic builder in src/core2/press-topics.ts the event's place as the slot; delete the early return at line 147 and its comment; mark SG-NATION-outside-measure-news-unworded resolved in src/core2/data/stopgaps/nation.json. Do not duplicate: reuse the existing measure-result move.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the words are bank pieces (words-engine, civic-prose). One rule, all 56 places: the place comes from the event's record, never a name in logic. American English.

**Done when.** A second session (not the builder), in a drawn place and seed it names, plays a year in dev mode until another state's ballot measure resolves and sees the national press print the result with that state's name, and finds the measure's record id on the story; a test in src/core2/press-topics tests or src/core2/national-events-climate.test.ts-style world states the chain.

**Waits on.** Nothing.

**Files.** src/core2/press-topics.ts, data/english/parts/news.json, src/core2/data/stopgaps/nation.json
