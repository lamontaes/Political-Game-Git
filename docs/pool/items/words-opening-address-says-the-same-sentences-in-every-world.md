---
id: words-opening-address-says-the-same-sentences-in-every-world
title: "The President's address says the same sentences in every world: each part gets many versions and inserts from this world"
area: words
kind: bug
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: claude (Words builder W2 for Fable B)
pr: 8743
after:
blocked-on:
lead: words
model: opus
effort: high
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine": "a ton of different speech versions ... this is a demonstration of the game")
checked: fable 2026-11-11
claimed-at:
branch: claude/words-opening-address-versions
---

**What.** The President's address is the first thing a new player hears. In two drawn worlds on Nov 11 (Duneland Beach, Indiana and Riverside, Washington) the two addresses shared five whole sentences ("To Congress: we're in this together whether we like it or not. I'll be knocking on your door.", "Governors, state lawmakers: I need you, and I'll act like it. My door's open.", "If you've been up at night this year doing the math on your bills, I hear you.") and made the same single policy point, with nothing in those sentences from either world. Seen: the President's address that opens a new life.

**Cause.** Found in code: `planAddress` in src/director/opening-story.ts builds the address from moves, and `composeAddress` in src/english/english-composition.ts fills each move from data/english/parts/opening-speech.json. Several moves have very few wordings for a voice: `to-congress` 3, `people` 5, `call` 5, `history` 5, `families` 6, `law` 6, `stake` 8, `lead-in` 8, and `pledge`, `unity` and `hope` 2 or 3 for some kinds of address. 950 of the bank's 1,022 pieces carry no slot, so a piece says the same thing whatever the year was. The policy points come from `presidentStands` and `standsAt` in the same file, which keep only questions the President holds a view on; most federal questions give no view yet (25 have no axis, pull request 8589), so an address often has no priority at all and one "line I won't cross".

**Fix.**

1. **Every move has at least 24 wordings for each voice,** and for each kind of address where the move is written by kind. Where a move has little to say, compose it from two shorter parts (an opener and a turn), so few parts make many sentences.
2. **Every piece that speaks of the country, Congress, the states or families carries a slot from the address's own facts:** the year's figures and claims (`countryFacts`), what a priority is about and what the President would do (`standFacts`: `about`, `to`), the President's home state, the Vice President's name. Declare each slot in the bank's `slots` map. A piece with nothing to insert is one that cannot stand as a sentence alone.
3. **The address names what it is asking Congress for.** The `to-congress` and `ask` pieces name the first priority (`{about}`, `{to}`), and when the President has no priority they name the year's hardest figure instead, so no address is all ceremony.
4. **Delete the pieces this replaces,** and any the owner graded bad, with every reference; a good-graded piece is never deleted. Then `npm run words:grade`, and `npm run words:rules` twice. Lower `opening-speech` in tests/guards/english/line-inserts-baseline.json to what the test asks for.
5. **A test on drawn worlds** (src/english/english-opening-speech.test.ts or the address's own test): across ten drawn worlds no whole sentence appears in more than two addresses, every address carries at least two figures or names from its world, and the addresses name at least three different policy points between them once pull request 8380 (Congress files on the research list) is on main; before that, the test says how many it found and does not fail on that count.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every piece is a bank part. No dice: which priorities and which claims the address makes come from the President's stands and the country's records; the engine's choice among wordings is seeded generation of how it is said, never of what is true. Estimate, never UNKNOWN: a figure the President cites is the record's figure, with its source id. One rule, all 56 places: the test draws its worlds.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds and reads each address through. No sentence is in more than one of the three; each address cites at least two figures or names from its own world (it checks one against the Metrics tab or the news); and each says what the President asks Congress for. tests/guards/english passes with the lowered count.

**Waits on.** Nothing.

**Files.** src/director/opening-story.ts, src/english/english-composition.ts, src/english/english-opening-speech.ts, src/english/english-opening-speech.test.ts, src/director/data/opening-address.json, data/english/parts/opening-speech.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Written by Fable B (2026-11-11) from a read of main at 3de4e2f423 and two addresses played in the running game that night. How many policy points an address has depends on the President holding views on federal questions, which pull requests 8589 (the cause) and 8380 (the build) cover; this item does not wait on them, and step 5 says how its test treats the count. The pieces under data/english/parts are drafted by the builder in the pull request with `Review: words` unless the CTO says the Story session writes them.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:35 UTC) on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Released (2026-11-11): opus-5251 (a builder told never to write lines under data/english/parts/) released it unbuilt: steps 1 to 4 are new and deleted pieces in data/english/parts/opening-speech.json, which are the Story session's to write (owner, Nov 10). Cause checked against main and it holds; a Story or Words session should take it. Continue on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:36 UTC) on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Released (2026-11-11): opus-5251 released it unbuilt again: its steps 1 to 4 are pieces in data/english/parts/opening-speech.json, the Story session's to write (owner, Nov 10); a builder told never to write there cannot take it. Continue on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:36 UTC) on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Released (2026-11-11): The Fix is lines under data/english/parts, which this builder may not touch; it waits on the CTO's ruling on who writes them (PR #8717). Continue on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:37 UTC) on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Released (2026-11-11): The Fix is lines under data/english/parts, which this builder may not touch; it waits on the CTO's ruling on who writes them (PR #8717). Continue on branch claude/pool-words-opening-address-says-the-same-sentences-in-every-world.

Built (2026-11-11) by the Words builder W2 for Fable B on branch claude/words-opening-address-versions: every move of the President's address is an opener and a core with a slot from the world; ten drawn worlds share no sentence among three addresses (src/director/opening-address-versions.test.ts); before and after in docs/seen/opening-address/.

Assigned by name (2026-11-11 07:10 UTC): the lead holds the words work (CTO, Nov 11, on the owner's ruling that every line goes through the English engine) and assigned this item to the Words builder W2 on branch claude/words-opening-address-versions, started 06:20 UTC. `next` should not hand it to a pool builder. Who writes the lines: the Words builder drafts the pieces under `data/english/parts` in its own pull request with `Review: words`; a pool builder still writes nothing there. The lead told the CTO this at 06:10 UTC on the crew's issue.
