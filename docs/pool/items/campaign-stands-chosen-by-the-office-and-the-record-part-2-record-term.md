---
id: campaign-stands-chosen-by-the-office-and-the-record-part-2-record-term
title: "A candidate's own job, votes and household raise the stands they run on (the platform's record term, now left out)"
area: elections
kind: stopgap
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: governing
model: opus
effort: medium
root: none
milestone: play-first
source: "Owner's sitting 2026-11-23-1, rows P28 and C11, and his answer to Desk question 3 (CTO comment 7117967924 on #9747); traced by the Dead stops tracer (lane 5), Nov 24"
---

**What.** The owner, Nov 23, on a candidate's stands: "random issues and stances with no reason why those are chosen." A nurse running for a county board should lead on the hospital, and a council member on what they voted for. Today the pick never looks at the candidate's own life.
Seen: the stands under each candidate on the Elections screen's race page, and the reason each one gives.

**Cause.** Found in code: `platformScores` (src/core2/campaign-stances.ts:387) scores each question the seat offers by conviction times the electorate's support only. The research's record factor, (1 + platformRecordWeight × record(q)), is a registered stopgap that is left out (`SG-GOV-platform-record-term-left-out`, campaign-stances.ts:398). So the candidate's job, their votes in office and their household's records never raise a stand, and the one chooser, `candidatePlatform` (campaign-stances.ts:456), has no reason from the person's life to give. The stopgap row (src/core2/data/stopgaps/gov.json, `SG-GOV-platform-record-term-left-out`) was resolved on Nov 10 as "Dropped (too in depth, owner)" by stand-in triage T2. That triage applied the owner's Nov 10 test (OWNER-DECISIONS: "where does the player see or feel this") and was not a ruling on this mechanic. The owner's Nov 23 answer names where it's seen: the Elections screen's stands "with no reason why those are chosen".

**Fix.** Replace the stopgap with the record term in `platformScores`: record(q) is how far the candidate's own records bear on the question, read from records that exist. Those are their job's sector against the question's policy area, their roll-call votes in office on bills of that question (the legislature's vote rows) and their household's records that the question's area names (a layoff, a rent notice, an illness). Set `platformRecordWeight` from the research the stopgap cites (`researcher`), as a sourced or estimated parameter with its spread. The stand's reason kept on the filing (part 1) names the record that raised it. Remove the marker in `platformScores` and update the resolved row to say what replaced it (skill `remove-a-stopgap`).

**Time box.** 4 hours for one Opus session.

**Rules.** Ask why: a stand raised by the record term names that record by id on the filing, and the proof prints it. Research before building: `platformRecordWeight` comes from the cited study, never a typed guess. No dice: the term is a weight on the person's own records, never a roll.

**Done when.** A second session builds a played world in a drawn place on main after the merge, advances it until local races have filers, and finds a candidate whose job or vote matches one of their stands, with that record's id on the filing as the stand's reason. It records the place, the seed and the filing's record id, and a test over drawn places shows the record term changing a platform against the same world with the weight set to zero.

**Waits on.** The CTO's word that the owner's Nov 23 answer reopens the record term triage dropped on Nov 10 (asked on #9747 by the Dead stops tracer), and campaign-stands-chosen-by-the-office-and-the-record (part 1: the office's own questions and the reason kept on the filing).

**Files.** src/core2/campaign-stances.ts, src/core2/data/campaigns/parameters.json

**You will see.** A candidate's stands fit their own life and record, and each says why.

**Screenshot.** A local race's page on the Elections screen with a stand that names its reason, from a drawn place, with the place and seed under it.

**Notes.** Split from part 1 so each part fits a 4-hour box (pool standard).
