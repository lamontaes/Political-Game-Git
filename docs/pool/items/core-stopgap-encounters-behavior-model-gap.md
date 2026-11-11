---
id: core-stopgap-encounters-behavior-model-gap
title: "Stopgaps in encounters (behavior-model-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
standard: 2
claimed-by:
pr: #5265
after:
blocked-on:
milestone:
model: sonnet
effort: medium
root: none
lead: lives
source: "src/core2/data/stopgaps.json, src/core2/data/encounters.json, kind behavior-model-gap"
claimed-at:
size: M
checked: fable 2026-11-10
---

**What.** Replace the stopgap row SG-P15-encounters (rows in src/core2/data/stopgaps/p15.json, data in src/core2/data/encounters.json). New people are met today only on a visit (the host's household) and on joining a group (its other members), and the first tie holds the act's hours; meetings at an organized meeting, neighbors and new coworkers wait for attendance and jobs. The town-hall slice (PRs #5261 and #5265) was sent back because its test did not require an attendee previously unknown to the host, so its met-fact and first-tie assertions could all be skipped. What remains is public-comment and council meetings, neighbors and new coworkers producing met facts and first-tie hours. Seen: the new people the player meets at a council meeting or a town hall, who become ties he can visit and ask for a vote; meeting people is a step of the golden path.

**Cause.** Found in code: src/core2/encounters.ts reads src/core2/data/encounters.json (stopgapId SG-P15-encounters, line 3): new people are met only on a visit (the host's household) and on joining a group; meetings at an organized meeting, neighbors and coworkers wait for attendance and jobs, and the first tie holds the act's hours.

**Fix.** Make unknown attendees at public-comment and council meetings, neighbors and new coworkers produce met facts and first-tie hours from the meeting, address and job records, with a test that requires an attendee previously unknown to the host; resolve SG-P15-encounters.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never close a row by deleting it; a registered stopgap closes only because the replacement is built and shown. Replace, never layer. Wire to the world: the met fact and the first tie are read by another engine (the people engine's ties, the journal) in a played year. No dice: who meets whom follows the meeting, address and job records. Every number lives in a parameter table, tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (place and seed named) and finds an attendee at a public-comment or council meeting, a neighbor and a new coworker each newly met by a person who did not know them, with the met fact and the first-tie hours shown by record id and read by another engine. A test requires an attendee previously unknown to the host, and SG-P15-encounters is resolved in src/core2/data/stopgaps/p15.json.

**Waits on.** Nothing.

**Files.** src/core2/encounters.ts, src/core2/data/encounters.json, src/core2/data/stopgaps/p15.json

**Notes.** First row: New people are met only on a visit (the host's household) and on joining a group (its other members); the first tie holds the act's hours. Meetings at an organized meeting wait for attendance, and new coworkers for jobs

Sent back 2026-10-20 from PR #5265 (branch claude/pool-encounters-meetings): The body explicitly leaves SG-P15-encounters open for public-comment/council meetings, neighbors and first-tie-hours evidence. The linked item Done when requires its rows resolved and a one-year played-world downstream read by record id. A town-hall-only unit proof does not complete it. Split the completed bounded town-hall change from the remaining explicit open work, or finish the original acceptance before marking that item done.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5265 (branch claude/pool-encounters-meetings): The town-hall regression does not require any attendee who was previously unknown to the host, so its new met-fact and first-tie assertions can all be skipped.; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5261 (branch claude/encounters-town-hall): the parent encounters item requires resolved rows and a one-year downstream record proof, but this branch explicitly delivers only a partial town-hall change with SG-P15-encounters still open; provide a genuinely bounded item/table and positive unknown-attendee met-fact/tie-hours evidence or complete the parent; finish on that branch, merge main into it first.
