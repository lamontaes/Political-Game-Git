# Losing: what carries forward depends on what you built (bank id b04, phase P1 council journey)

## What the player experiences

You lost. The game does not end and does not hand you a consolation score. What you keep is exactly what you built. The people you met at their doors still remember meeting you, and the ones who liked you still like you. The volunteers who worked hard for you are still your friends, and whether they will help next time depends on them and on how you treated them, including how you lost. Money left in the campaign account stays there under your state's rules, for next time or to give away. If you built something bigger, a group of people who keep meeting because they believe in what you ran on, that group keeps going after the loss, keeps showing up at meetings and keeps bringing in new people. Most candidates carry little; someone who built a following carries a lot. After the loss your journal tells you, in your own voice, what you have left.

## Owner decisions this rests on

- "Losing: what carries forward depends on what the politician built (a movement carries a lot; most carry little)."
- Movements can be a cause organization or a body of followers (Register line 37).
- Constitution item 19: losing is gameplay, never a game over.
- "Losing candidates stay as lightweight people" (Register line 759). Emergent, not authored; zero dice.

## Existing code it must use

- `src/simulation/campaigns.ts:2099 closeCampaignAfterElection`: status `lost`, "The campaign is over; the life is not" (:2123); ends candidate and staff work (:2136-2152); cancels campaign calendar holds (:2156); rivals' speeches. "A loss closes nothing else" (:2097).
- `src/simulation/campaign-recognition.ts:43 doorKnockingReturn` (:79-118): counts every `campaign.contact` interaction the candidate ever had: contacts from a lost race ALREADY carry into the next one.
- `src/simulation/official-view-reads.ts:168 viewOfOfficial`, `:277 townSupportFromViews` (recent views weigh more): residents' saved views of the candidate persist as private beliefs.
- `src/simulation/speech-reception.ts:119 electionNightWitnesses`, `:146 speechReactionOf`: how the people in the room took the concession.
- `src/simulation/campaign-money-sources.ts:49-52` `"leftover-funds"` source: unbuilt.
- `src/simulation/living-world/party-chapters.ts:813 joinPartyChapter`, `:889 leavePartyChapter`: the existing organization-participation pattern for a group with members.
- `src/simulation/living-world/civic-actions.ts:57-63 STAKE.groupMember`: group members already contact officials and attend meetings more.
- `src/simulation/neighbor-news.ts:58 peopleTiedTo`, `:96 tellPeopleOf`: news traveling the tie graph.

## What to change

1. **Leftover money follows state law.** Build `"leftover-funds"`: at loss the committee's balance stays in the committee organization; per-state rules (researched in one pass, ≤10 min; estimated from similar states where unread) say what it may do: keep for a future race, refund donors, give to charity or a party. The player picks among the allowed uses; nothing is spent automatically. A later `fileCampaign` by the same person can carry it in as a money source.
2. **Volunteers decide again, later.** No "loyal" flag. When the player next asks (b02 `askToHelp`), the decision reads the person's record, now including: how the last race ended, their reaction to the concession (`speechReactionOf`), whether the candidate thanked them (a post-loss choice that writes a relationship interaction), and their view of the candidate.
3. **A group can outlive the campaign.** After a loss (or win), the player may turn the campaign committee into a standing group: same organization, new purpose, named by the player. Each active helper and each contact with a strong positive view is asked to join through `evaluateDecision` (their view, salience of the issues the candidate ran on, free time, traits); joining writes an organization participation the way `joinPartyChapter` does. Members then act through existing paths: civic actions (group member stake), attending council meetings, telling people they know (`peopleTiedTo`), and they can be asked to recruit. The group's size after a year is whatever its members did, not a number the game set.
4. **What you have left, in your words.** At loss, a journal chapter (Session 4 / Q3 journal chapters) composed from records: how many people met you and how many still think well of you, who helped and is still close, money left and its allowed uses, the group and its members if any. Uses `composeGroundedLine`, first person, no numbers beyond what a person would say.
5. **Nothing else resets or is added.** Recognition, views, relationships and contacts stay exactly as recorded; no recovery bonus, no decay timer beyond the existing recency weighting.

## Must NOT build

- A "comeback score", reputation meter, or a carry-forward percentage.
- A movement engine separate from organizations and memberships (Session 25 owns party founding/splits; this only reuses organization participation).
- Automatic donations or refunds of leftover money.
- Authored loss text or a fixed list of consolation outcomes.
- Wiping or weakening contacts and views on loss.

## Done when (proof in a played game)

- Random town: run a thin campaign and lose. Journal shows a short chapter: a few people met, little money, no group. Next race: recognition starts from those contacts (print the contact ids carried).
- Second random town: run a campaign with many contacts and helpers, lose, thank the volunteers, form a group. Five of them join for their own reasons (print each decision's reasons), two decline. Over the next in-game year, group members appear at council meetings and in civic-action records; the next race's helper asks succeed more because of those records.
- Tests: `campaign-loss-carry.test.ts` (contacts and views identical before and after closure; leftover money stays and offers only the state's allowed uses), `campaign-group.test.ts` (same world → same joiners; non-supporter declines; members' civic-action stake includes the group).

## Depends on

b02 (helpers, `askToHelp`), Session 4 (scenes, journal chapters), Session 13 (results), Session 24 (next election reads your record), Session 25 (parties; a group may later found one through its path).

## Open questions for the owner

1. When can a candidate turn their campaign into a standing group?
   - (a) Any time, win or lose, if anyone joins (recommended)
   - (b) Only after a loss
   - (c) Only by founding a separate cause group, not from the campaign
