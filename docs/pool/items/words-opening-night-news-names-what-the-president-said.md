---
id: words-opening-night-news-names-what-the-president-said
title: "The first night's news about the address names what the President said"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-opening-evening-talk-raises-what-the-president-said
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine": the opening is the address and the evening after it, the household talk and that night's news)
checked: fable 2026-11-11
---

**What.** On the first night the paper and the newscast carry the President's address. The story gives the President's name, the kind of address and the date, and nothing of what was said, though its bank parts have slots for a quote, the unemployment rate and wage growth that nothing fills. The owner ruled that the opening is the demonstration of the game: the night's news names the points the President made, in this world's own figures. Seen: News on the first night of a new life, the lead story on the President's address.

**Cause.** Found in code: the `address` builder in src/bench/printed-words.ts hands the story only `name`, `inaugural` or `joint-session`, and `date`. `STORY_KINDS.address` in src/english/english-newscast.ts asks for the context parts `address-unemployment`, `address-wages` and `address-quote`, whose slots `{unemployment_rate}`, `{wage_growth}` and `{quote}` have no producer for the President's address (the local address builder in the same file does supply `quote`). The points the President made are in `Ledger.opening.address.sentences` (src/director/opening-story.ts) and are not read here.

**Fix.** Read the address's points through `addressPoints` (src/director/opening-facts.ts, from the item this one follows). The `address` builder supplies: `quote` (the address's remembered line), up to three points as `about` and `to`, and the country's unemployment rate and wage growth from the same records the address itself reads for its claims (`countryFacts` in src/director/opening-story.ts), so the paper and the speech agree. Add news and headline parts that name a point (`{about}`, `{to}`) in at least 10 wordings each, and give the newscast an address story of its own. Every new part carries a slot; lower the guard's counts in tests/guards/english/line-inserts-baseline.json where lines are replaced.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the story is bank parts filled from the address's record. Estimate, never UNKNOWN: a figure the story prints is the same figure the address read, with its source id. Ask why: the story's source ids name the address and each point's sentence. One rule, all 56 places: the test draws its places.

**Done when.** A second session, in the running game on main, starts three new lives in drawn places it writes down with their seeds, opens News on the first night and reads a lead story on the address that names at least two things the President said and one figure; it finds each in that life's address text; and the three stories do not share a sentence. tests/guards/english passes.

**Waits on.** words-opening-evening-talk-raises-what-the-president-said.

**Files.** src/bench/printed-words.ts, src/english/english-newscast.ts, src/director/opening-facts.ts, src/director/opening-story.ts, data/english/parts/news.json, data/english/parts/headlines.json, data/english/parts/newscast.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Written by Fable B (2026-11-11) from a read of main at 3de4e2f423.
