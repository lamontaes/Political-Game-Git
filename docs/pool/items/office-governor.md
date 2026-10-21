---
id: office-governor
title: "Governor:"
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-governor
pr: #4871
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 23 (unchecked checklist line)"
claimed-at: 2026-10-20T02:02:07.229Z
---

**What.** Checked against main on Oct 16: PARTLY. Built: the budget message (`budget-proposal` reads into `councilBudget`), executive orders (one orderable order), the line-item veto (`executiveItemVeto`), the State of the State, and appointment (`appointGovernor`, called only from a script, not an office-day entry). Missing: clemency anywhere; emergency and Guard powers are deferred by the owner. Next: Clemency, and make governor appointment an office-day entry. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** One rule, all 56 places: every power and its limits come from state data for all 56 places, with no state named in code; An effect is a read, not a record: the legislature reads the governor's budget and vetoes, and departments read orders and appointments, at the moment they act; Ask why: each act keeps reasons and the law row it cites; The chain is the acceptance: follow one line-item veto from the act to the budget line cut, the program funding that changed and a person it reached; No dice: when the player does not choose, the character decides from traits and the law, not a roll; No hand-written player text: orders, speeches and results are worded by the English engine; This is a game, not a spreadsheet: each power is one choice at its season, not a form; Replace, never layer: any governor stand-in is deleted.

**Done when.** In a drawn state (buildBenchWorld, seed named in the PR body) a governor's clemency act on a state conviction changes the sentence the justice engine reads, shown by the sentence and clemency record ids, and a test in `src/core2/office-day-state.test.ts` covers it. The owner plays it: Clemency, and make governor appointment an office-day entry.

**Files.** src/core2/office-day-state.ts, src/core2/modules/executive.ts, src/core2/appointments.ts, src/core2/data/office-day/state-line-item-veto.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.

Looked at Oct 16 (claude, released, not built). Clemency has the data it needs: `data/research/clemency/clemency-gates-2026.json` gives each place's real gate (the bodies whose yes a grant needs, in order, plus any advisory board), and `src/simulation/justice/clemency-rules.ts` reads it. What is missing is everything around the act. (1) The justice engine (`modules/justice.ts`) only convicts people the corruption engine recorded bribing or taking a bribe, so in a played year there are few or no state convictions to pardon; an act with nothing to act on cannot be proven in a generated world. (2) Nobody petitions: a petition needs a petitioner with a reason (a person serving a term who asks after serving part of it), and that is a decision to build in the people engine, not a form. (3) The boards the gates name (pardons and parole boards, councils) are not people in the world, so a gate that needs a board's yes has no one to say it; a stand-in (the board agrees when the governor asks) would need an owner-decision stopgap. (4) The effect is small and clear once those exist: a commutation ends the custody row early (`release` in justice.ts already ends it on the release date), a pardon takes the conviction out of `convictionsOf` so candidacy, voting and views stop reading it. Suggested order: let the justice engine convict from more causes (the same bar for counted adults, see laws-convictions-counted-reach), then petitions, then the governor's act.

Sent back 2026-10-17 from PR #4871 (branch claude/governor-clemency): The clemency route never limits prisoners to the governor’s jurisdiction. clemencyDue(api, governorId, date) takes the first global prisonersServing(api) entry, and grantClemency checks only that custody is serving; neither follows the sentence/case/prosecutor authority to the governor’s state. Filter and enforce the recorded jurisdiction and clemency authority before release, and add a generated-world regression proving a governor cannot commute another state’s or a federal sentence. Keep the existing release assertions.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4871 (branch claude/governor-clemency): Code conflict with main in src/core2/modules/justice.ts; finish on that branch, merge main into it first.
