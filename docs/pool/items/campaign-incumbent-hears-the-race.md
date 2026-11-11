---
id: campaign-incumbent-hears-the-race
title: "An incumbent hears a challenger is gaining from what people tell them, not from how warm their friends are"
area: elections
kind: bug
priority: 1
size: M
status: blocked
claimed-by: claude/pool-campaign-incumbent-hears-the-race
pr: 8516
after:
blocked-on: campaign-incumbent-response-test-red-by-seed
lead: governing
source: governing lead, Nov 1 (trace of the played-year proof's clause d)
claimed-at: 2026-11-11T03:15:11.696Z
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
branch: claude/pool-campaign-incumbent-hears-the-race
---

**What.** rivalDay steps an incumbent up only when raceReading shows a threat above zero, and in a council race that reading never does: a poll needs about 9,000 dollars set aside and no council campaign has it, and word of a rival is read as how warm the incumbent's own circle is to each candidate (SG-GOV-threat-from-circle), which always favors the incumbent. Traced on seed 7d00da010de8fe91 in Lecompton, Kansas and Vinita, Oklahoma, the threat was negative on every word day even when the circle held 12 door yeses for the player against 6 for the incumbent, so the incumbent never came home to campaign. The reading should be what people have actually told the candidate: the yeses to a rival held by people in touch with them since, and what residents say at the candidate's own doors. The told door answers (the doors row's told field, kept by toldAtDoor) must open a reading by themselves, sourced from a kept record of the evening they were told, without waiting for a rivalWord row or a poll, so recordSteppedUp keeps one stepped-up row for each new evening's answers. SG-GOV-threat-from-told-yeses registers the gap until then.

**Cause.** Found in code: src/core2/modules/campaigns.ts `rivalDay` (line 6026) steps an incumbent up only when `raceReading` (line 5910) shows a threat above zero, and in a council race it never does: a poll needs about 9,000 dollars and word of a rival is read as how warm the incumbent's own circle is (SG-GOV-threat-from-circle, src/core2/data/stopgaps/gov.json line 1901). Measured on seed 7d00da010de8fe91 in Lecompton, Kansas and Vinita, Oklahoma.

**Fix.** Read the race from what reached the incumbent: the yeses to a rival held by people in touch since, plus the residents' told yeses in the incumbent's own doors rows, which open a reading by themselves without a rivalWord row or a poll, naming pledge ids. Keep one stepped-up row for each new evening's answers. Review branch governing/incumbent-hears-the-race (6d0f3bd18c) first.

**Time box.** 4 hours for an Opus session.

**Rules.** Ask why: the incumbent reacts only to what reached them, by record (a yes held by someone in touch since, a resident's answer at their door), never to anyone's true support. One model, two tiers: counted residents tell the candidate at the candidate's doors by the same rule full people do through contact, times their count. No dice: the reading decides nothing by chance. Speed: no scan of the town each day; read the circle and the campaign's own door rows (the byCampaign index).

**Done when.** A second session, in a drawn place built with buildBenchWorld and its seed printed, sees `raceReading` report the rival's share as the circle's yeses in touch since plus the residents who told the incumbent's own canvass of a yes, naming the pledge ids, and sees an incumbent with no rivalWord row and no poll step up from a doors record alone. src/core2/campaign-incumbent-response.test.ts passes with a twin day whose yeses are removed showing no step-up. On seed 7d00da010de8fe91 the incumbent steps up after the player gains in Lecompton or Vinita, by stepped-up row id, the played test accepts the doors source kind, and speed:year stays within 20 percent of its base.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-incumbent-response.test.ts, src/core2/campaign-real-race-played.test.ts (new), src/core2/data/stopgaps/gov.json

**Notes.** Nov 2, 01:40 (governing lead): branch governing/incumbent-hears-the-race at 6d0f3bd18c (clause (d)'s engine fix, built by a workflow on Nov 1). Not re-checked since. Next: read the branch's commits against the done-when, run its test on two fresh seeds, then open the PR or write what is left here.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:15 UTC) on branch claude/pool-campaign-incumbent-hears-the-race.

Blocked (2026-11-11, opus-5234): the Fix is built on PR #8516 (branch claude/pool-campaign-incumbent-hears-the-race): the told reading carried from governing/incumbent-hears-the-race, and door evenings open a reading by themselves; its test file cannot find a race to test in drawn places, on main too (campaign-incumbent-response-test-red-by-seed). Continue on that branch once the blocker lands.
