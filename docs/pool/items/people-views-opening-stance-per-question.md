---
id: people-views-opening-stance-per-question
title: "Views form an opening stance per question; campaigning reads it instead of the lean stand-in"
area: people
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/people-views-opening-stance-per-question
pr: #4856
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:31:26.711Z
---

**What.** `viewOn` is still lean times an axis plus what the person has heard. Form an opening stance per policy question from the person's own traits, faith, education and state's survey spread, then replace the remaining `platformAgreement(lean, ...)` calls (electorate.ts, meetings.ts, office-day-federal-president.ts, election-ties.ts) with `agreementWith`. Resolves SG-GOV-views-stand-in.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place two neighbors of different traits hold different recorded stances on the same question before any campaign, and a vote tally reads them, by person and stance ids. SG-GOV-views-stand-in is resolved.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/electorate.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Oct 20 (claude/people-views-opening-stance-per-question, claimed and released, nothing built). Read `views.ts` (`viewOn` = `personStance(lean, question)` plus the heard-shift) and `campaign-views.ts` (`questionAxis`, one signed axis per question, from GSS and Pew by party). What the item asks for, a per-question opening stance from traits, faith, education and the state's survey spread, needs data the repo does not hold: the only per-question number is one axis per question, with no per-state or per-demographic spread. A stance built from traits without that spread would be a made-up deviation, and a person-level deviation of any size would move every vote tally, so it needs the sourced table first. Next: a research item for a per-question spread by state and by faith and education cell (CES 2024 and GSS), then the stance formed from it.
