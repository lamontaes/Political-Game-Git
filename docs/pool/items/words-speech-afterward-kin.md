---
id: words-speech-afterward-kin
title: "A candidate's own family hears a kin's words after the speech, not a stranger's ask for their vote"
area: words
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: words-scene-for-unstaged-big-moments
source: added with npm run pool -- add
lead: words
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
checked: fable 2026-11-10
---

**What.** #6136 stages the speech-afterward scene for every listener a candidate's in-person speech moved, and the candidate asks each one for their vote. In Huntley, Wyoming the candidate's own partner is among them and hears "I meant every word up there. Can I count on your vote?" with the lead "Your partner comes your way as the room empties." A partner, parent or child would hear something kin say, such as asking how it went, with replies that still move their view.

**Cause.** Found in code: data/english/parts/scene-talk.json (line 91651) holds the only speech-afterward ask, "I meant every word up there. Can I count on your vote?", and src/director/purpose-scene.ts passes the scene no relation from the family record, so a partner hears the same line as a stranger (seen in Huntley, Wyoming, with the lead "Your partner comes your way as the room empties.").

**Fix.** Pass the listener's relation from the family record to the scene and add kin-tagged ask and reply pieces (Story writes them) chosen by that relation; strangers keep the ask-support lines, and the reply still keeps or breaks the vote promise the ask-support purpose records.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Words engine: the director passes the listener's relation to the candidate from the family record, and the English engine picks kin lines by it; no words in the director. Wire to the world: the reply still keeps or breaks the vote promise the ask-support purpose records. One rule, all 56 places.

**Done when.** A second session, not the builder, runs a played-world test in a drawn place (seed named) that finds a candidate whose household member heard their speech in person, and sees that scene's ask and replies come from kin lines tagged by the family record's relation, cited by record id, while a stranger's scene keeps the ask-support lines.

**Waits on.** Nothing. (words-scene-for-unstaged-big-moments, which it once waited on, is built on main.)

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json

**Notes.** TODO
