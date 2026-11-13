---
id: words-machine-part-6-one-line-spots-ranked-for-story
title: "The words machine, part 6: the spots with a single line, listed by how often a player meets them"
area: words
kind: research
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/fable-b2-one-line-spots
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: design-words-machine
source: split from words-machine-rules-from-the-owners-notes by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
claimed-at: 2026-11-13T04:23:31.168Z
branch: claude/fable-b2-one-line-spots
---

**What.** Nearly half of all spots have one line, so a player hears the same words every time and pulling that line leaves the spot silent. Story needs to know which of them a player actually meets. This part counts how often each one plays in three drawn places and lists them in that order.

**Cause.** Measured: `npm run words:rules` on main at 756370e86b reports 5,206 spots, 2,427 of them with one line, and one spot left with only waiting lines.

**Fix.** Write a script that builds the scenes of three drawn places for a year with the crew's scene tool, counts how many times each one-line spot plays, and writes the spots in order with their bank, key, line and count to a file under docs/words/. Print the places and seeds at the top. It lists; it changes no bank.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One rule, all 56 places: the three places are drawn, never chosen, and named with their seeds. One run, one number. Story writes every line (CTO, Nov 10).

**Done when.** A second session runs the script on main in a drawn place it names with its seed, and the ten most-played one-line spots in its run are within the top fifty of the committed list; it plays the game in that place and meets at least one of them.

**Waits on.** Nothing.

**Files.** scripts/words/run-rules.ts, scripts/words/one-line-spots.ts (new), docs/words/one-line-spots.md (new)

**Notes.** Released by next (2026-11-11): no push to claude/fable-b2-one-line-spots since 2026-11-10 18:00 UTC, more than twice its 3-hour time box. Continue on branch claude/fable-b2-one-line-spots.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:01 UTC) on branch claude/fable-b2-one-line-spots.

Released by next (2026-11-11): no push to claude/fable-b2-one-line-spots since 2026-11-10 18:00 UTC, more than twice its 3-hour time box. Continue on branch claude/fable-b2-one-line-spots.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:03 UTC) on branch claude/fable-b2-one-line-spots.

Released by next (2026-11-13): no push to claude/fable-b2-one-line-spots since 2026-11-10 18:00 UTC, more than twice its 3-hour time box. Continue on branch claude/fable-b2-one-line-spots.

Claimed by next for sonnet-64fc (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-13 04:22 UTC) on branch claude/fable-b2-one-line-spots.
