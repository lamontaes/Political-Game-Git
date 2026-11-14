---
id: press-reporter-names-alderman-race-as-council-member
title: "A reporter calls an alderman candidate someone running for council member"
area: words
kind: bug
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
effort: medium
source: "Account lead interview check, Nov 14, 2026 (train 04a2c7e4)"
root: none
claimed-at:
---

**What.** At the municipal clerk's office in Shelby, Mississippi, the clerk offers "I want to run for alderman" and says "You'd have a seat on the Shelby Board of Aldermen". Months later every reporter's invitation opens "Hello. Is this the Pat who's running for council member?", and the debate invitation names "the other candidates for council member". Seen at Shelby, Mississippi (2867040), place seed b9c9caeca52322c89c12ddea061719a6525f2e846c2e89bae66a1b2091f26977 (pin-b:1). Filed Jan 21, 2025 at the counter by hand (the alderman reply, then "Where do I sign for alderman?"), invitations May 13, May 20, May 22 and May 27, 2025. Log: /mnt/project-files/seen/interviews/shelby-ms-04a2c7e4/full-log.txt (project files). Seen: the reporter's and the debate moderator's invitation calls.

**Cause.** Needs cause. The counter names the seat through `seatSaid(..., { asMember: true })` in src/english/journal-words.ts. The invitation's `{office}` in data/english/parts/scene-talk.json ("Hello. Is this the {first} who's running for {office}?") is filled from somewhere that does not go through it. Find where the interview-invite and debate-invite scenes fill `office`.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: the name comes from the seat record, never from a place named in code.

**Done when.** A second session files for a seat whose body is not a council, at a drawn place and seed, and the reporter's call names the seat the same way the clerk did.

**Waits on.** Nothing.

**Files.** src/english/journal-words.ts, src/director/purpose-scene.ts
