---
id: play-stop-05-politics-lists-wrong-officials
title: "Politics lists three U.S. senators, the wrong congressman, 180 state legislators and no mayor"
area: gov
kind: bug
priority: 1
size: S
status: blocked
claimed-by: claude/pool-play-stop-05-politics-lists-wrong-officials
pr: #8261
after:
blocked-on: parties-list-shows-ballot-lines-as-parties
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
checked: fable 2026-11-10
claimed-at: 2026-11-11T07:49:52.989Z
branch: claude/pool-play-stop-05-politics-lists-wrong-officials
---

**What.** In Anson, Texas on the v0.22.10 release, Politics, then Government listed three U.S. senators, the U.S. Speaker from New York as one of the player's two representatives, about 180 state legislators, and no mayor, with council terms of 28 and 16 years. Parties showed only the Republican party. The owner expected his mayor, his council with normal terms, his two senators, his one representative and both parties. Both children (-a, merged in PR 6127, and -b, PR 6791) are done. What is left is a second session's replay of the finish line in a drawn place.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. Both children are done and the parent was only the owner's installed-build acceptance; the lists are built in src/bench/government.ts from the opening's key people (src/core2/opening-key-people.ts). Not replayed in a game.

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the representatives shown are the player's own districts read from the place's records, the same way in every place. Estimate, never UNKNOWN: a term or a mayor the data lacks starts from the real pattern, marked as an estimate. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts the bench in a town drawn from all 56 (place and seed named) and opens Politics, then Government, and Parties, with screenshots at 1440x900: the player's mayor, a council with plausible terms, two U.S. senators where the place has them, one U.S. representative, one state legislator per chamber, and every party holding seats. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. What it was blocked on is done; what is left is a second session's check in the running game (skill seen-in-game).

**Files.** src/bench/government.ts, src/core2/opening-key-people.ts, src/core2/modules/offices.ts, src/bench/play.mjs

**You will see.** Politics lists your own officials and the parties that hold seats where you live.

**Screenshot.** Government and Parties, from a drawn place, with the place and seed under them.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:57; screenshots 24, 26. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was laws. Split Oct 24 into play-stop-05-politics-lists-wrong-officials-a and play-stop-05-politics-lists-wrong-officials-b, each four hours or less; the CTO sets this item done when the last part is done.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:00 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released by next (2026-11-11): no push to claude/pool-play-stop-05-politics-lists-wrong-officials since 2026-11-10 23:00 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:03 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Replay-only item; partial replay posted on its child PR (mayor and council seen in Abbott TX; Federal lists the whole state delegation); pool seen refuses non-merged items; not complete. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:08 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Claimed by my own next loop but not worked: see my earlier release notes (replay-only or heavy-run items); words-director part 2 is a six-hour refactor of presence deciders across bench and english pickers that I did not start. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:17 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Replayed by API on main (no browser screenshots). Tiverton, RI (4470700, place seed 7c584d33d780): key people = 2 U.S. senators, 1 U.S. representative (own district), own state representative; bodies local: Town council (5), no executive (no mayor row); state: 75+38, governor etc.; federal 2 reps + 2 senators of the state, president, VP. Stockett, MT (3071350): 3 county commissioners and county sheriff/attorney/clerk/treasurer/coroner, 2 senators, 1 own representative; state 100+50. Faga'itua, American Samoa: no local bodies at all. Not checked: council term lengths, every party holding seats (only the first party printed). Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:20 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Same replay note as before. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:25 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released by next (2026-11-11): no push to claude/pool-play-stop-05-politics-lists-wrong-officials since 2026-11-10 23:00 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:26 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Replayed headlessly in three drawn places (no screens): senators and legislators now right except Tocsin, Indiana, which lists no U.S. representative or state legislator among its seats, and no drawn place had a mayor; evidence on #8261. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:28 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Replayed headlessly in drawn places; evidence is on the item's PR; not a played check with screens. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:31 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): Seen on screen in one drawn place (two senators, one representative, state House with its split); mayor and every-party steps not confirmed; evidence on #8261. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 07:36 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.

Released (2026-11-11): A split parent (parts -a and -b carry the work; the CTO sets it done) handed out while the game PR cap is on; nothing to build here. Continue on branch claude/pool-play-stop-05-politics-lists-wrong-officials and pull request #8261.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 07:49 UTC) on branch claude/pool-play-stop-05-politics-lists-wrong-officials.
