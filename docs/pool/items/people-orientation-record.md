---
id: people-orientation-record
title: "Adults carry a recorded orientation, read when pairing, so who partners with whom follows each person's own record"
area: people
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: split from people-partnership-counted by pool feeder Oct 20
standard: 2
model: opus
effort: medium
root: design-life-record
lead: lives
checked: fable 2026-11-10
---

**What.** Give each full adult a recorded orientation (who they can partner with), and have the partnership rules read it. Today no record in src/core2 holds one, and the partnership engine pairs only a woman and a man, which the owner ruled a defect on Oct 19 ("who pairs with whom reads each person's own record, including orientation"). The opening assigns it when it generates the household, consistent with the household's makeup: the partners of every same-sex couple the ACS household tables place in the household get a matching record, and everyone else draws it from the place's sourced adult shares by age. A counted adult uses the place's same-sex couple share as the group's weight. Seen: who partners with whom in town and on people's cards (owner's ruling, Oct 19).

**Cause.** Found in code: src/core2/modules/partnerships.ts pairs a partner of the other sex only (stopgap SG-LIVES-partner-same-sex, src/core2/data/stopgaps/lives.json line 39); no orientation record exists in src/core2.

**Fix.** Give each adult an orientation record at the opening from the household's makeup and sourced shares, read by the partnership rules; delete the other-sex-only rule in partnerships.ts.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the record is seeded generation of who exists, consistent with the household already written; the partnership rules then read it with no chance step. Estimate, never UNKNOWN: a figure a player can see starts from the real average with a per-world spread, marked ESTIMATED with its source (ACS B11009, Gallup or Williams Institute adult shares). One model, two tiers: the counted tier reads the same shares times the group's count, and a full person filled in matches their household. One rule, all 56 places. This is a game, not a spreadsheet: the record only changes who can pair. Replace, never layer: the woman-and-man-only pairing is deleted.

**Done when.** A second session runs a one-year played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) and sees every adult have an orientation record by id, every opening partner link agree with both partners' records, and the partnership forming rule in partnerships.ts pair two adults only when each record admits the other, shown for at least one same-sex pair formed in the year or a test case in src/core2/people-orientation.test.ts that names the place and seed.

**Waits on.** Nothing. (people-partnership-forms, which it once waited on, is built on main.)

**Files.** src/core2/opening-partnership.ts, src/core2/data/opening-partnership.json, src/core2/modules/partnerships.ts, src/core2/data/stopgaps/lives.json, src/core2/people-orientation.test.ts (new)

**Notes.** Created by the pool feeder Oct 20 from the owner ruling of Oct 19 (OWNER-DECISIONS.md, "Pairing"). The partnership forms and ends PRs (#4963, #4970) carry the woman-and-man rule; whoever builds this replaces it there.

Deferred Oct 25: nothing on screen reads it yet.

Oct 25 audit: blocked-on now names the item (people-partnership-forms) instead of its PR.
