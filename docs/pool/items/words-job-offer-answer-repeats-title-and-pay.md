---
id: words-job-offer-answer-repeats-title-and-pay
title: "Asked 'What would I be doing?', the employer on the phone repeats the job title and the pay (Ninnekah, Oklahoma)"
area: words
kind: bug
priority: 2
size: S
status: merged
claimed-by:
pr: #8796
after:
blocked-on:
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4)
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-job-offer-answer-repeats-title-and-pay
merged-at: 2026-11-11T18:59:50.040Z
---

**What.** The job-offer call does what a scene should: it names the firm, the job and the pay and offers four replies. But when the player asks about the work, the caller says again what the offer already said. Measured by the audit with the crew's scene tool in Ninnekah, Oklahoma (seed 3dac8ffb3f3c, a 17-year-old, one year): asked "What would I be doing?", the caller repeats the title and the pay. Measured again by me on Nov 10's main (commit 8ac2262853), same seed: "We went through everybody, and we'd like to bring you on as a construction laborer, at $16.25 an hour." "What would I be doing?" "$16.25 an hour to start. We'd train you on the rest." In Odessa, Washington (seed fd7e212758b7) the answer to "Tell me more about it." was "We'd go over all of it on your first day." Read in the bank: the job-offer purpose has three answer lines in data/english/parts/scene-talk.json, "You'd be {position}, at {pay} an hour to start.", "{pay} an hour to start. We'd train you on the rest." and "We'd go over all of it on your first day.", and none says what the work is. `composeBinding` (src/director/purpose-scene.ts:310; the job-offer facts are near line 445) gives the scene four facts only: the employer, the position, the pay and the deadline. Fix the class: an answer to a question says something the line before it did not. For the job offer, the answer comes from what the jobs records already hold about the opening (the occupation, the hours and shift of the position's schedule, what the business does, whose place it fills when the opening replaces someone), each said only when the record holds it.

**Cause.** Measured: `node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed 3dac8ffb3f3c --out <file>` (Ninnekah, Oklahoma, a 17-year-old, one year; re-measured Nov 10 on main, commit 8ac2262853): asked "What would I be doing?", the caller says "$16.25 an hour to start. We'd train you on the rest." All three job-offer answers in data/english/parts/scene-talk.json repeat the offer, because composeBinding (src/director/purpose-scene.ts, line 313) gives the scene only four job-offer facts: employer, position, pay and deadline.

**Fix.** Add job-offer facts read from the jobs engine's rows (occupation, the hours and shift of the position's schedule, what the business does, whose place the opening fills when it replaces someone), each said only when the record holds it, and write answer pieces that use them; remove the answers that only repeat what the offer said.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the new answers are bank pieces for the job-offer purpose, each naming the record facts it needs, and the three answers that only repeat the offer are removed or held back wherever a fuller one can be said. Wire to the world: every fact in the answer is read from the jobs engine's own rows (the offer, the position, its schedule, the employer), cited by record id, and nothing about the work is invented. One model, two tiers: an opening that stands for a counted worker says the same facts by the same rule. The owner's rulings as docs/coordination/OWNER-DECISIONS.md records them: Oct 14, 2026, a reply's second move follows from its first; Oct 15, 2026, a reply continues the conversation.

**Done when.** A second session, not the builder, starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, plays a jobless adult with dev mode's Run until an employer calls, picks the reply that asks about the work, and takes a screenshot. It must see an answer that names at least one thing the offer line did not (the hours, the shift, the kind of work or who the job was before), with the record id of each fact shown in dev mode's trace or the scene's why rows. It runs the crew's scene tool on the audit's seed 3dac8ffb3f3c (`node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/scene-year.ts --seed 3dac8ffb3f3c --out <file>`) and reads every job-offer exchange in the output: in none of the 15 does the answer to "What would I be doing?" or "Tell me more about it." consist only of the title and the pay. A bank test for the job-offer purpose fails when an answer line's facts are all facts the statement line already said. The owner plays it: when he asks what the job is, the person on the phone tells him something about the job.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/core2/modules/jobs.ts, src/director/scene-talk.test.ts

**Notes.** From the Fable audit, Pillar 4 ("Three more played lives, a year each"): "The offer itself does what a scene should: it names the firm, the job and the pay and offers four replies. But asked 'What would I be doing?', the caller repeats the title and the pay."

Nov 10 repro on main (commit 8ac2262853), scene-year.ts, seed 3dac8ffb3f3c: 2026-12-21, David Osborn of Thompson Construction, the exchange quoted above. The record behind the call is the jobs engine's `job-offered` event (`offerToPlayer`, src/core2/modules/jobs.ts:4357), whose facts are offeredBy, invitedId, offerId, organizationId, title, hourlyMinor and deadline. The position row (`PositionRow`, same file) also holds the occupation, the template job the schedule comes from and, for a replacement, the job and person it replaces; I did not check which of these every opening fills in, so each new line names its fact and plays only when it is there.

The audit did not verify how often the repeat comes up; it reported the one exchange. In my Ninnekah run every one of the 15 offers used one of the three answers above. Since the audit's copy, a note of the owner's changed the offer's opening line in open work ("We'd like to offer you the job. You'd start as a sales associate, at $11.11 an hour."); that line is on Nov 10's main too and does not change the answer.

Related: words-job-offer-scene-lines (done; wrote the scene's first lines), director-cap-on-scene-repeats (the same call coming 15 times), words-everyday-talk-one-engine (claimed; replies that fit the question in everyday talk).

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:15 UTC) on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.

Released (2026-11-11): needs Story's answer lines under data/english/parts; see draft PR. Continue on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:16 UTC) on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.

Released (2026-11-11): re-offered after release; see draft PR 8461. Continue on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.

Released (2026-11-11): needs Story's answer lines under data/english/parts; new facts without lines would be an unread record; see draft PR 8461. Continue on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:21 UTC) on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.

Released by next (2026-11-11): no push to claude/pool-words-job-offer-answer-repeats-title-and-pay since 2026-11-11 02:15 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-words-job-offer-answer-repeats-title-and-pay.
