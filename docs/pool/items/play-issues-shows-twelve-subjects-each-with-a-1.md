---
id: play-issues-shows-twelve-subjects-each-with-a-1
title: "Issues opens on a run of subjects that each hold one law, 12 of them with a 1 beside each in the audit's New Hampshire life"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)")
---

**What.** Measured by the audit on Nov 9: "Issues still shows 12 subjects with a '1' beside each." The audit's line gives no place or seed; its browser life was in Blodgett Landing, New Hampshire, a random world. The owner met it on Nov 8 at about 2:10 p.m. Eastern (v0.94.0, Manchester, Connecticut): "Why is there only why do a bunch of things have one? I don't understand. I don't like this law menu or issues menu." Read in code on main, Nov 10, not measured: `issues()` in `src/bench/play.mjs` (line 5020) groups every law by the word between the colon and the first dot of its series (`groupOf`, line 5040), labels a group from `politics.issueGroups` in `src/bench/data/controls.json` (14 subjects) or, when the table has no entry, prints the raw key through `words(key)` (line 5146), and sorts by the table's order, so a key the table lacks sorts first (line 5133). The federal questions (`us-federal-positions:` in `src/core2/data/legislature/federal-answers.json`) carry their own domain words such as health, trade and immigration, which the table does not hold, so each becomes its own subject with one law and the count "1" beside it (line 5147). Fix the cause, not this list: every law in every family lands in one of the subjects the player already has, from the law's own data, and no subject is made from a key the screen has no word for.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the subject of a law is read from the law's data the same way in every place, never from a list of federal series typed into the screen. No hand-written player text: a subject's name comes from the worded table, and a key with no worded name is a defect, never printed raw. Owner, Nov 5 (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 18): "This doesn't cover all the issues. It's supposed to be all the 86 things. I had previously approved how it was done." Owner, Nov 8, 2:10 p.m.: "why do a bunch of things have one?"

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), opens Politics, then Issues, and takes a screenshot at 1440×900. The subject list must show only subjects named in the worded table, in the table's order, and no subject whose name is a raw key. Every federal law must sit inside one of those subjects, so the count of laws across subjects equals the count before the change. The list must not open on a run of subjects that hold one law each. The same check is then repeated in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed for that life), as the named repro, and the screenshot is set beside the approved render `docs/mocks/2026-11-08-play/renders/pl-issues.jpg`. The owner plays it: he opens Issues and sees a short list of subjects he recognizes, each holding several laws.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/bench/government.ts, src/core2/data/legislature/federal-answers.json

**Notes.** From the audit's Pillar 6, one of seven leftovers it re-checked in the game from the 72 points of the owner's Nov 8 playtest. The playtest check (docs/coordination/playtest/2026-11-08-1-check.md, point P26) counted 11 federal-only questions with keys outside the 14 subjects; the audit counted 12 subjects with a 1; neither count was re-measured for this item. Related open items: play-issues-law-page-and-what-shows (the law page and what the list shows; the check file names it for P26 but it does not mention one-law subjects), play-issues-real-statutes-and-dates (the statute row on the law page). The pager on this screen is already the one long-list box with no arrows (`rosterScreen`). Not verified by the audit: whether the 12 are all federal questions.
