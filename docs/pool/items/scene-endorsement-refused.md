---
id: scene-endorsement-refused
title: "An endorsement asked for and refused plays as a scene with the person who said no and the reason"
area: director
kind: feature
priority: 1
size: M
status: done
claimed-by:
pr: #6301
blocked-on:
source: "Helper B, Oct 27, docs/design/scenes/from-life/endorsement-refused.md"
lead: director
claimed-at:
---

**What.** Trigger: the endorsement ask record (campaigns-endorsement-ask-answer-record) with answer declined or not yet. Place: the person's own home or workplace, a public place, or the phone. Cast: the person asked, chosen closest first with a standing weight for an officer of a body, a party chair, a former office-holder or an editor; the preferred rival read from the same agreement score. Outcome: the candidate's reply writes the answer record's follow-up (try again after changing the platform, a smaller ask, quiet) and a relationship contact; the campaign's reach, the press stopgap SG-PEOPLE-press-endorsements and the rival's campaign read it. Lines are in the packet for the words lead.

**Rules.** Cast from the world: the person is named by the ask record, never invented. No dice: the reply follows the person's recorded reason. Replace never layer: the bulk yes-or-no sweep in the bench is replaced by the one-person ask.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a refused ask fires the scene with the person and reason from the ask record id, the reply writes a record and a tie contact, a test fails when the ask record is absent, and bench screenshots at 1440x900.

**Time box.** 4 hours.

**Files.** src/director/data/situation-types.json, src/director/purpose-scene.ts, src/bench/campaign.ts, data/english/parts/scene-talk.json

**Notes.** Waits on campaigns-endorsement-ask-answer-record. Lines drafted in docs/design/scenes/from-life/endorsement-refused.md for the words lead. Two other lives it covers: a union local declining a presidential candidate over unmet commitments; a newspaper declining a council endorsement over a conflict.
