# Losing: what carries forward depends on what you built (bank id b04, phase P1 council journey; unlocks "next election runs on the record" after a loss)

Verified against origin/main 1ee0abcda. Bank spec: docs/codex/specs/bank/b04-what-a-loss-carries-forward.md.

## What the player experiences

You lost. The game does not end and gives no consolation score. You keep exactly what you built. People you met at their doors still remember you, and those who liked you still do. Volunteers who worked hard are still your friends; whether they help next time depends on them and on how you treated them, including how you lost. Money left in the committee stays there under your state's rules. If you built something bigger, a group of people who keep meeting because they believe in what you ran on, you can make it a standing group at any time, win or lose, and anyone who wants to joins; it keeps showing up at meetings and bringing in new people. Most candidates carry little; someone with a following carries a lot. Your journal tells you, in your own voice, what you have left.

## Owner decisions it rests on

- "Losing: what carries forward depends on what the politician built (a movement carries a lot; most carry little)."
- Owner answer (this round): a campaign can become a standing group at any time, win or lose, if people join.
- Movements can be a cause organization or a body of followers (Register line 37). Losing is gameplay, never a game over (Constitution item 19). "Losing candidates stay as lightweight people" (Register line 759).
- Fixed rules: zero dice; nothing blank or placeholder, estimate from similar places and mark; one rule for all 50 states, D.C., territories; emergent; real data calibrates the start only; one writer per record kind; delete what you replace.

## Existing code to extend (verified)

- `src/simulation/campaigns.ts:2099 closeCampaignAfterElection` (private function): writes terminal state `lost`/`won` ("The campaign is over; the life is not" :2123), ends candidate and staff work at `result.resolvedAt` (:2136-2152), cancels calendar holds (:2156), rivals' speeches (:2161). Called from the resolver path (`resolveCampaignElectionFromRecordedInput` just below). Its doc says "A loss closes nothing else".
- `src/simulation/campaign-recognition.ts:43 doorKnockingReturn` (:79-118) counts every `campaign.contact` interaction the candidate ever had (:89), so contacts from a lost race already carry. Do not touch.
- `src/simulation/official-view-reads.ts:168 viewOfOfficial`, `:277 townSupportFromViews`: views persist as private beliefs (recency weighted).
- `src/simulation/speech-reception.ts:119 electionNightWitnesses`, `:148 speechReactionOf` (a concession reaction branch exists: "context:race-lost"); written by `campaign-speeches.ts:155 recordElectionSpeech`.
- `src/simulation/campaign-money-sources.ts:49-52`: `"leftover-funds"` declared `status: "unbuilt"` ("Money left from the candidate's earlier campaign carries over"). It is read by the money-source catalog (:17 header). Do not add a second source list.
- `src/simulation/living-world/party-chapters.ts:813 joinPartyChapter`, `:889 leavePartyChapter`, plus `CHAPTER_MEMBERSHIP_KIND` and `organizationParticipationStateAt` use (:267-305): the organization-participation pattern with members.
- `src/simulation/living-world/civic-actions.ts:58 STAKE`, `groupMember: 1` (:63), group-member set parameter at :96: members' stake already rises. Find where `groupMembers` is built and extend that set source to include standing-group participations.
- `src/simulation/neighbor-news.ts:58 peopleTiedTo`, `:96 tellPeopleOf`.
- CORRECTION to bank spec: it says helpers are asked through b02 `askToHelp`. `askToHelp` / `ask-to-help` does NOT exist on main (grep empty) because b02 is not built. Step 2 must be built as the decision inputs b02's ask will read (see switch below), not wired into a function that is not there.
- Newer code covering part: none. Recognition carry-over is already working; leftover money and groups are new.
- Research in repo: `docs/research/92M-campaign-finance-ethics-lobbying.json` (per-jurisdiction finance rules: reporting windows etc.; the personal-use rule is open in `docs/research/chatgpt-answers/2026-09-22-campaign-finance-regulators/CAMPAIGN-FINANCE-REGULATORS-52.md` item list). Nothing in repo states what each state allows for leftover funds.

## Build steps (one PR each)

1. **Leftover money follows state law.** Build `"leftover-funds"` in `campaign-money-sources.ts` (flip status, keep one list). At loss the committee's balance stays in the committee organization. A data file `data/research/campaign-reality/leftover-funds-rules.json` (one row per state, D.C., territory; each: allowed uses among keep-for-future-race, refund-donors, give-to-charity, give-to-party/candidate, with source or `estimated-from: <similar state>` marker) says what it may do. Player picks among allowed uses; nothing is spent automatically. A later `fileCampaign` by the same person can carry the balance in. Must not: auto-refund; any personal-use path.
2. **Volunteers decide again, later.** No "loyal" flag. Add the inputs a later ask will read: how the last race ended, the person's `speechReactionOf` to the concession, whether the candidate thanked them (a post-loss choice that writes a relationship interaction), their view of the candidate. Export one function `helperAskConsiderations(world, personId, candidateId)` returning the considerations; b02's `askToHelp` will call it. A loss must not zero or reduce anything. Must not: build `askToHelp` here.
3. **A group can outlive the campaign.** At any time, win or lose, the player may turn the committee into a standing group (same organization, new purpose, named by the player). Each active helper and each contact with a strong positive view is asked to join through `evaluateDecision` (their view, salience of issues the candidate ran on, free time, traits); joining writes an organization participation the way `joinPartyChapter` does (new kind `standing-group-member`, same status machinery). Members act through existing paths: civic actions (extend the `groupMembers` set), attending council meetings, telling people they know (`peopleTiedTo`), recruiting when asked. Size after a year is whatever members did.
4. **What you have left, in your words.** At loss a journal chapter (Session 4 / Q3 journal chapters), composed from records through `composeGroundedLine`, first person: how many people met you and how many still think well of you (said as a person would, no totals table), who helped and is still close, money left and its allowed uses, the group and members if any. Never a score.
5. **Nothing else resets or is added.** Recognition, views, relationships, contacts stay as recorded; no recovery bonus, no decay timer beyond existing recency weighting.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- Open items and their switches: (a) when a group may form: owner answered "any time, win or lose, if anyone joins"; switch = a data row `standingGroupAllowedFrom` (list of campaign states allowed: `active`, `won`, `lost`) read by the form-group function, default all three. (b) Leftover-use options per state: switch = the rows in `leftover-funds-rules.json`; where a state is unread, the row says `estimated-from` and offers keep-for-future-race and refund-donors only.

## Must NOT build

A "comeback score", reputation meter or carry-forward percentage; a movement engine separate from organizations and memberships (Session 25 owns party founding/splits); automatic donations or refunds of leftover money; authored loss text or a fixed list of consolation outcomes; wiping or weakening contacts and views on loss; `askToHelp` itself.

## Research tables

Missing from repo; ONE web search done (Oct 5, 2026), summary only:

| Question                                           | Finding                                                                                                                                                                                                                                                                                                                                                                                                   | Source                                                                                                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What may a losing candidate do with leftover funds | Federal and state law bar personal use. Common allowed uses: keep the committee open for a later race, refund contributors, give to charity, give to a party or other candidates. New York lets even defeated candidates keep the money. Virginia lets candidates spend on non-campaign ads, staffing, charity, meals tied to office; no duty to close the account, though most close within a few years. | VPM "Virginia candidates raked in millions, what can they do with what's left over"; Brooklyn Eagle 2019-01-25 "State law allows defeated candidates to keep campaign funds"; Republic Times "Where does leftover campaign money go?" |

Judgement: this establishes the option menu but no 56-row table. Build the data file with all rows present; fill VA and NY from the sources, all others `estimated-from` a researched neighbor type (keep/refund/charity/party menu) until a proper pass (the open `state-campaign-finance-regulators` question lists personal_use_rule per state and is the place to fill from). Never leave a row blank.

## Done when (played-game proof)

- Random town: a thin campaign, lose. Journal shows a short chapter: a few people met, little money, no group. Next race: recognition starts from those contacts (print contact ids carried).
- Second random town: many contacts and helpers, lose, thank volunteers, form a group. About five join for their own reasons (print each decision's reasons), two decline. Over the next in-game year group members appear at council meetings and in civic-action records (print them). A win also allows forming the group.
- Tests: `campaign-loss-carry.test.ts` (contacts and views identical before and after closure; leftover money stays and offers only the state's allowed uses), `campaign-group.test.ts` (same world, same joiners; non-supporter declines; members' civic-action stake includes the group).

## Proof to post

Random places and seeds; printed journal chapter; carried contact ids; each join decision's reasons; civic-action rows a year later; deleted/replaced list ("Replaces:" the unbuilt flag on `leftover-funds`); typecheck and changed tests green.
