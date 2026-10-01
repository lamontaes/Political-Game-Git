# Congress records a term-limit proposal before voting

Before: Congress privately counted presidential term-limit ballots before saving a proposal. A losing count left no proposal or rejection rollcall.

After: The actual proposal enters the shared chamber vote with the same members and reasons. A rejection remains on the record. The existing constitutional writer still decides whether the proposal passes. The CTO approved this retained rejection record; exact-head review remains separate.

## Why-chain

Measured source finding: the old review counted ballots before calling its proposal writer (`federal-reform.ts` before this patch, line 301). A losing count returned early. That left no saved question for a shared chamber adapter to validate and no rollcall describing the rejection. Bedrock finding: an actual congressional action was missing from the record.

Measured source finding: the candidate saves the proposal before passing its ID and real congressional seats to the shared vote (`federal-reform.ts:336`). That engine reads the unchanged party, relationship and constitutional-bar considerations. It selects each member's ballot without a draw. The existing constitutional writer then saves the actual result.

Inferred limitation: this migration does not supply constituent outreach, news, sponsors' negotiations or natural persuasion. The existing automatic cause and unnamed congressional sponsoring authority remain. The migration changes the decision route and action record, not those missing political inputs.

## Research

Measured primary-source reading: Article V requires two-thirds of both Houses to propose amendments and three-fourths of states to ratify them ([National Archives](https://www.archives.gov/founding-docs/constitution-transcript)). The inherited legal thresholds and ratification route remain unchanged. Party and constitutional-bar weights are authored game assumptions, not measured voting probabilities.

## Revisions

Measured source finding: only the congressional proposal caller migrates (`federal-reform.ts:315`). State ratification and state governor-term-limit callers retain their existing evaluator. Their rationale ranking now imports the existing chamber weight helper, removing the local copy of the same table.

Measured source finding: an already resolved proposal returns its existing world without another rollcall (`federal-reform.ts:552`). The proposal keeps its stable key, terms, dates and identity. The shared constitutional arm validates the actual dated proposal and roster; no ordinary bill or nominee is fabricated.

## What gets built

1. Extract the unchanged term-limit considerations for both the migrated and retained callers.
2. Save the canonical term-limit proposal before shared House and Senate decisions.
3. Record the result through the existing constitutional rollcall writer and retain a rejection.
4. Export the existing rationale-weight helper and remove the caller's duplicate table.
5. Prove old/new directions and reasons, player absence, successful and rejected rollcalls, repeat handling and Save/Continue.

## Simulated, records, world pieces, checks

Measured: the comparison uses the actual 435 House members, 100 senators, President and saved national parties (`federal-term-limit-chamber-vote.test.ts:36`). Five people receive supplied party participation records. These are authored non-neutral inputs in both arms, not natural political persuasion or newly generated officials.

Measured: the successful fixture supplies further supportive affiliations on existing members. Both chambers pass before the existing 50 state actions are scheduled (`federal-term-limit-chamber-vote.test.ts:182`). Their dates remain the inherited seeded timing profile. That timing remains an explicit limitation; the patch adds no draw and does not use timing to select ballots.

Measured: the rejected fixture saves its actual House rejection, schedules no state action, and preserves action IDs after canonical Continue (`federal-term-limit-chamber-vote.test.ts:161`). A controlled member remains absent without a ballot. Repeat callbacks append neither another proposal nor another action.

## Proof run

Measured: six selected tests passed in 81.67 seconds on the final main composition (`/tmp/team2-a79-term-limit-composed.log`). They include five new caller cases and the existing ratified-amendment integration case. One unrelated calendar test was not selected. Across both chambers and both amendment directions, 1,070 old/shared ballots and recorded reasons matched; zero directions changed.

Measured: the seed A79-recorded-term-limit-chamber selected Ashaway, Rhode Island, from the 56 starting jurisdiction identities (`federal-term-limit-chamber-vote.test.ts:29`). This proves one populated starting world and its national Congress. It is not a proof of 56 populated worlds or an ordinary year.

## Worked example

Measured: Elizabeth Schultz voted yea to extend the actual President's limit in both routes, then nay to restore it in both routes (`/tmp/team2-a79-term-limit-composed.log:5`). The supplied term set a three-term lifetime cap for the comparison. It was a proposal, not an enacted change to anyone's eligibility.

Measured: Deborah McIntyre's Senate ballots also matched for both directions (`/tmp/team2-a79-term-limit-composed.log:6`). The saved proposal identity was constitutional-measure_cde9560f42ff9903. The rejection fixture produced a recorded congressional refusal. No money moved and no 38-state ratification or operative amendment is claimed.

## Method and handoff

Audit gap A79. Owned changes are the federal-reform congressional proposal/count/order and shared input builder, the chamber rationale-helper export, the focused test, and the existing integration assertion that now requires a rejected proposal record. The previous Article V adapter is a dependency already merged on fetched main. No new chamber engine, schema, law reader, legal threshold, catalog or state ratification algorithm.

Current composed runtime source is 62a34bd3137591f762ece3ed81afe9c2a54993ee, with main 072634b352c182c0ee75abe59e1e73e772ed73e4. Its selected six-case rerun passed. Four strict roots reported zero diagnostics on this composition. Changed lint, format and whitespace passed. Zero-dice reported zero new findings and five inherited stale entries, exiting 1. The committed release check passed against fetched main.

The native command uses the existing Team 2 storage guard and selects only the new caller tests plus the existing ratified-amendment case. No timeout was increased. Browser, full suite, ordinary yearly review, all-56 populated-world proofs and an exclusive year-speed comparison were NOT RUN. State constitutional preflight and ratification callers remain separate unfinished A79 work. A97's positive saved-action contract remains with Audit. The CTO approved proposal-first ordering and the retained rejection action at 5:16 a.m. Next: exact-head review, then the next authorized caller.
