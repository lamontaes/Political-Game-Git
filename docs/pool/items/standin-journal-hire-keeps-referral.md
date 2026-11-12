---
id: standin-journal-hire-keeps-referral
title: "A job found through an official's referral is told in the journal as help from that official"
area: words
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: sonnet
effort: medium
root: design-life-record
---

**What.** Stand-in SG-WORDS-journal-story-no-helper. The journal tells a job found as a small story of how long, what it paid and the employer before, but never says who helped, though an official's referral is on record. Seen: in the journal line that tells how a person found a job.

**Cause.** Found in code: src/core2/modules/jobs.ts recordReferral (line 3441) and referralStanding (line 3468) keep the referral and employers read it when they choose among applicants, but the hire and the spell row (the spells table, line 474 onward) keep no referral id, and src/director/journal.ts reads none.

**Fix.** When the jobs engine hires a seeker who held a live referral, keep the referral id and the official on the spell row it writes. Add a journal follow field (as the work stories of src/director/data/journal-rows.json already use) that names the official only when the spell row cites a referral. Resolve the stand-in in src/director/data/stopgaps.json. Cost: one lookup on the hire day.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the journal reads the spell row. No invented helper: no referral on record means no line. No dice. One rule, all 56 places. American English and the English engine's banks for the line.

**Done when.** A second session plays a year in a drawn place (place and seed named), has an official help a resident looking for work who is then hired, and finds the spell row citing the referral by id and the dated journal line naming the official; a hire with no referral gets no helper line; the stand-in is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/director/journal.ts, src/director/data/journal-rows.json, src/director/data/stopgaps.json
