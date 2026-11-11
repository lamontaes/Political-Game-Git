---
id: words-one-sponsor-one-evening-setup
title: "The one-evening ask test builds its sponsor's two asks instead of waiting for a played year to have them"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: rc2-done-from-records
lead: director
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-one-sponsor-one-evening-setup
---

**What.** src/director/one-sponsor-one-evening.test.ts waits for a played year in which one sponsor asks the player about two bills on one evening. Once governing/ask-skips-held-bills sends each bill to its committee the evening before (legislature-ask-skips-bills-the-committee-will-hold), a held bill leaves the agenda before the asks, so the case is rare: on seed fd20a2a4fc1f6997, six places over 150 and 240 days had none, and twelve draws at 240 days ran out of memory. The governing lead covers the staging with a built-world test meanwhile (Words agreed, Nov 2).

**Cause.** Found in code: src/director/one-sponsor-one-evening.test.ts draws places and skips (`continue`, lines 70, 94, 157 and 174) every place with no sponsor holding two bills on one floor day, so the one-evening case runs only when the draw happens to hold it. Measured: on seed fd20a2a4fc1f6997, six places over 150 and 240 days had none, and twelve draws at 240 days ran out of memory.

**Fix.** Build the case from the engine's own ask records in a bench world (a sponsor with two bills passing committee on one floor day) instead of waiting for a draw to hold it.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the sponsor's two asks come from bills the legislature's own engine moved through committee, never from a forced roll. One rule, all 56 places: the setup draws its place and names it with the seed. The case is built from the engine's own ask records in a bench world, never from hand-inserted lines (played-world-proof).

**Done when.** A second session, not the builder, runs src/director/one-sponsor-one-evening.test.ts in a drawn place (named with its seed) and sees the test build a sponsor with two bills that pass committee on one floor day, the director stage one evening scene naming both asks by record id, and the test fail as evidence when the scene splits into two evenings.

**Waits on.** Nothing.

**Files.** src/director/one-sponsor-one-evening.test.ts

**Notes.** Filed by Words at handoff (Nov 2, 02:55 UTC) on the governing lead's question.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 01:15 UTC) on branch claude/pool-words-one-sponsor-one-evening-setup.

Released (2026-11-11): Tried staging two bills of one sponsor with draftBill + placeOnAgenda in the test: upcomingMeeting(api, state chamber) returned nothing in 150 days in 6 drawn places (Declo ID, Sand Pillow WI, Sweet Home AR, Scappoose OR, Briar Chapel NC, Pinehurst ID, seed fd20a2a4fc1f6997), so bills cannot be placed that way; the floor-day source of floorAgendaOn needs reading first. A 240-day draw also ran out of memory. No code pushed. Continue on branch claude/pool-words-one-sponsor-one-evening-setup.
