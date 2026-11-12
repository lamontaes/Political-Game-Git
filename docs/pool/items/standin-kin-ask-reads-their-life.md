---
id: standin-kin-ask-reads-their-life
title: "What a relative asks in a letter, a reunion, a celebration or after a missed gathering comes from the relative's own records"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: effects
standard: 2
model: sonnet
effort: medium
root: design-life-record
---

**What.** Stand-ins SG-WORDS-letter-ask-unrecorded, SG-WORDS-gathering-ask-unrecorded, SG-WORDS-reunion-ask-unrecorded and SG-WORDS-celebration-ask-unrecorded. A relative's ask (come visit, write, a lead on work, make up) is worded the same way for every relative, and nothing on a record says this one wants a visit or a job. Seen: in the letter, reunion or celebration where a relative asks for something.

**Cause.** Found in code: src/director/purpose-scene.ts lines 591 and 616 (the markers) word the ask for every letter, reunion, celebration and gathering; src/core2/modules/kin-contact.ts writes family.contact (line 20) and family.gathering-missed (line 21) with only who and how close, and no topic or reason.

**Fix.** Add one read in src/core2/modules/kin-contact.ts, kinWants(core, personId), that returns what the relative's existing records say: out of work (the jobs engine's seeker row), ill (the health case), far away (livesElsewhere and the place distance), a quarrel on the tie, a new child (the family records). Write the result as a topic on family.contact and a reason on family.gathering-missed, and let the reunion and celebration scenes read the same function, so the ask is the one the records give. A relative with none of these gets the plain ask, marked. No new wants table. Resolve the four stand-ins in src/director/data/stopgaps.json. Cost: read when a contact or gathering record is written, not daily.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the scene reads the topic by record id. Ask why: a line that names a reason cites the record it came from. No dice. One rule, all 56 places. Never claim a reason the records do not hold.

**Done when.** A second session plays a year in a drawn place (place and seed named), finds a letter and a missed-gathering record carrying a topic or reason by id taken from the relative's own records, and sees the scene's ask match it; a relative with no such record shows the plain ask; the four stand-ins are resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/kin-contact.ts, src/director/purpose-scene.ts, src/director/data/stopgaps.json, src/core2/modules/jobs.ts, src/core2/modules/health.ts
