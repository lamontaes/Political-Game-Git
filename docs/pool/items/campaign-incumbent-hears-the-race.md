---
id: campaign-incumbent-hears-the-race
title: "An incumbent hears a challenger is gaining from what people tell them, not from how warm their friends are"
area: elections
kind: bug
priority: 1
size: M
status: claimed
claimed-by: governing/incumbent-hears-the-race
pr:
blocked-on:
lead: governing
source: governing lead, Nov 1 (trace of the played-year proof's clause d)
claimed-at: 2026-11-01T15:09:47.897Z
---

**What.** rivalDay steps an incumbent up only when raceReading shows a threat above zero, and in a council race that reading never does: a poll needs about 9,000 dollars set aside and no council campaign has it, and word of a rival is read as how warm the incumbent's own circle is to each candidate (SG-GOV-threat-from-circle), which always favors the incumbent. Traced on seed 7d00da010de8fe91 in Lecompton, Kansas and Vinita, Oklahoma, the threat was negative on every word day even when the circle held 12 door yeses for the player against 6 for the incumbent, so the incumbent never came home to campaign. The reading should be what people have actually told the candidate: the yeses to a rival held by people in touch with them since, and what residents say at the candidate's own doors.

**Rules.** Ask why: the incumbent reacts only to what reached them, by record (a yes held by someone in touch since, a resident's answer at their door), never to anyone's true support. One model, two tiers: counted residents tell the candidate at the candidate's doors by the same rule full people do through contact. No dice: the reading decides nothing by chance. Speed: no scan of the town each day; read the circle and the campaign's own door rows.

**Done when.** In a buildBenchWorld place with its seed printed, raceReading's word branch reports the rival's share as the people in the incumbent's circle in touch since a yes to that rival plus the residents who told the incumbent's own canvass of a yes to that rival, naming the pledge ids; the best rival on the ballot is the one named; campaign-incumbent-response.test.ts passes with a twin day whose yeses are removed showing no step-up; and the played-year proof on seed 7d00da010de8fe91 finds the incumbent stepping up after the player gains in Lecompton or Vinita, by stepped-up row id; speed:year is within 20 percent of its base.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-incumbent-response.test.ts, src/core2/data/stopgaps.json

**Notes.** Nov 2, 01:40 (governing lead): branch governing/incumbent-hears-the-race at 6d0f3bd18c (clause (d)'s engine fix, built by a workflow on Nov 1). Not re-checked since. Next: read the branch's commits against the done-when, run its test on two fresh seeds, then open the PR or write what is left here.
