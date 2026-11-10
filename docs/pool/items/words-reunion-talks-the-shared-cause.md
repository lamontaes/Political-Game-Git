---
id: words-reunion-talks-the-shared-cause
title: "A reunion over a shared cause talks about the cause, not the old school"
area: words
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "words batch-12 reading, Oct 15"
after:
lead: director
standard: 2
model: sonnet
effort: medium
root: rc6-scenes-repeat
size: S
checked: fable 2026-11-10
---

**What.** In Brookside, Delaware (bench cache seed batch-12), ten reunions fire from `cause.shared` records (two former classmates both back the clean-electricity standard). Every talk opens "Do you remember Newark Charter School?". The record that fired the scene is the shared cause, so the talk should open on it: the cause, the stance they share, what either did about it. That gives the scene a political endpoint (owner, Oct 15: a scene has an endpoint).

**Cause.** Measured: Brookside, Delaware, bench cache seed batch-12: ten reunions fired from cause.shared records (two former classmates both back the clean-electricity standard) all open "Do you remember Newark Charter School?". The opener is chosen in src/director/conversation.ts (schoolOf, line 338, and the bank piece "Do you remember {school}?" at data/english/parts/conversation.json line 5635); the cause.shared record is read by the cause-invite type (src/director/data/situation-types.json, line 5279; label feeling:event:cause.shared at line 5306).

**Fix.** Open a reunion that came from a cause.shared record on the shared cause and the stance they share (cited from the person's view record), instead of the old-school opener.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: the talk opens from the scene's moment and cites the shared cause record that actually brought these people together. Knowing is a read: the stance is cited only from the person's view record. No hand-written text: words come from the conversation bank.

**Done when.** A second session, not the builder, runs a bench year in a drawn place from all 56 (place and seed named) and in Brookside, Delaware (seed batch-12) and sees each reunion that came from a shared cause open on that cause, by record id; a test names the seed and the shared stance records and rejects the old-school opener for that scene.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json, src/director/data/conversation-rules.json, src/director/data/situation-types.json
