---
id: campaigns-endorsement-ask-answer-record
title: "An endorsement ask writes a record with the answer and the reason, for a refusal as well as a yes"
area: elections
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "Helper B, Oct 27, docs/design/scenes/from-life/endorsement-refused.md"
lead: effects
claimed-at:
---

**What.** Asking a person to endorse runs askForEndorsement, which weighs their agreement with the asker's platform against each rival's and their trait lean, then returns true or false and keeps nothing for a no. In a played world (Weston, Ohio, the candidate's 3 known people) three asks wrote 0 records. A scene cannot say who refused or why. Write an ask record naming asker, person asked, answer and reason kind (disagrees on an issue, prefers a named rival, would not endorse anyone, not yet), and keep the existing rule that a yes reaches the endorser's circle.

**Rules.** No dice: the answer already follows the person's agreement score and traits, and the record only keeps what was computed. Wire to the world: the press engine and the director read the record by id. Estimate, never UNKNOWN: a reason is always one of the named kinds.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a candidate who asks the people they know gets one ask record per person with the answer and a reason kind, a test fails when a refusal writes none, and the director's endorsement scene reads one of them by record id.

**Time box.** 4 hours.

**Files.** src/core2/modules/campaigns.ts, src/bench/campaign.ts

**Notes.** Found while packeting scene-endorsement-refused; the same function is called for every known person at once, which the scene item turns into one person at a time.
