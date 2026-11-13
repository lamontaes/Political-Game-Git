---
id: play-nov8-journal-says-he-moved-to-where-he-was-born
title: "The journal says a man moved to the place he was born in, because a parent lives elsewhere today (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #8459
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: design-life-record
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point C30, not fixed)
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-nov8-journal-says-he-moved-to-where-he-was-born
---

**What.** The owner, Nov 8, about 2:20 p.m. (v0.94.0, Manchester, Connecticut), on his journal: "None of my history is simulated." The CTO's note (point C30): the chapter "Connecticut 1981" opens with "I moved to Connecticut" though he was born there in 1981, and ends with "I moved to Connecticut" again. A person born in the town whose mother has since moved away gets a move record from the mother's town to their own, and the journal tells it as the person's own move to where they live now. Where someone came from should be read from their own birthplace and their own place records, never from where a parent lives today, and a person born where they live has no move told; the chapter title names the town, not only the state.

**Cause.** Found in code: `originOf` in src/core2/past-moves.ts (line 37) looks first for a living parent whose home today is outside the county and only then at the person's recorded birthplace, then writes `person.moved-in` (`PERSON_MOVED_IN`, line 27). src/director/journal.ts tells every such record as "I moved to {place}" (about lines 400 to 405 and 861 to 864) and titles the first chapter with that place. Read on Nov 10, not measured in the running game.

**Fix.** Make `originOf` read the person's own birthplace and own place records and never a parent's current home; write no move for someone born where they live. Have the journal title the first chapter with the town's name. The lives lead should review it (`.agents/skills/lives/SKILL.md`).

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: a move in the journal names the record that says the person lived somewhere else first, and a parent's address today is not that record. One model, two tiers: the same rule decides the past of a counted person filled in on a click, so the person the player opens matches what the records say. Owner, Oct 14 (OWNER-DECISIONS): "The journal is a dramatized story, not a list of facts."

**Done when.** A second session (not the builder) starts the bench (`npm run bench`) with dev mode on, starts a new game in a drawn place (place and seed named) and, for the player and for five adults opened from People, reads the birthplace and any `person.moved-in` record in dev mode's person panel, with a screenshot at 1440x900 of the Journal's first chapter (the player) or the life section of the card (the others). Nobody whose birthplace is the place they live in is told as having moved there, nobody's move names a place their own records never put them in, and a chapter title names the town. A test runs the past in six drawn places and fails on any move record whose from-place comes only from a parent's current home. The check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/core2/past-moves.ts, src/director/journal.ts, data/english/parts/journal.json

**Notes.** From the Nov 8 playtest, point C30 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check D): "past-moves.ts:37-55 counts anyone whose living parent lives outside the county today as having moved in, so a man born there 'moves in.' Every move is worded as a move to where he lives now... The first chapter is titled with that place, which comes out as 'Connecticut,' not Manchester"; root cause there: "Where he came from is read from a parent's home today, not his birthplace"; owner: Lives. Neither file has changed since that check (compared against the check's commit on Nov 10). The opener "More than a year on" in the same quote is fixed (the span words now reach years). This item sits in the past engine, not in a screen; the lead named on it is the one the audit's filing brief gave every Nov 8 leftover, and the lives lead should review it (`.agents/skills/lives/SKILL.md`). Related open: core-deep-past-school-place-from-birthplace (schooling follows the birthplace), core-deep-past-kin-past-on-fill-in. Related, filed Nov 10: play-journal-says-one-thing-three-times, play-nov8-journal-chapter-has-no-picture. The thin past itself (no partners, accidents or college before day one; points P32 and P36) is the audit's Pillar 4 life record and is not this item. Not verified: nothing here was measured in the running game on Nov 10.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:09 UTC) on branch claude/pool-play-nov8-journal-says-he-moved-to-where-he-was-born.

Released by next (2026-11-11): no push to claude/pool-play-nov8-journal-says-he-moved-to-where-he-was-born since 2026-11-11 02:09 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-play-nov8-journal-says-he-moved-to-where-he-was-born and pull request #8459.
