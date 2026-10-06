# Constituents: how your office handles them (bank id b06, phase P1 council journey)

## What the player experiences

Once you hold office, people reach out to you, often. A neighbor whose rent jumped after a law passed calls you. A man who lost his job stops you at the diner. A woman furious about your vote writes a letter. You decide how your office handles all this: take every one yourself, let others handle the routine ones and bring you the unusual ones, or let others handle everything and tell you what happened. On a town council you usually have no staff, so "others" means the town's own clerk and departments you refer people to; higher up it means your caseworkers. The ones that come to you play as short scenes, and what you say is remembered. The rest are handled in the background the way your office usually handles that kind of request, and you get a short summary. How you treat people changes what they think of you and what they tell their friends.

## Owner decisions this rests on

- "Constituents: often; player decides how their office handles them (self, delegate…); most simulated in background from the office's usual approach."
- Staff results come from skill, potential, personality and passion (Register line 30). Zero dice; emergent; one rule for every office level.

## Existing code it must use

- `src/simulation/living-world/civic-actions.ts:165 reviewTownCivicActions`: quarterly, each adult resident's stake (:96-160) decides whether they contact an official (the one they hold the strongest view of, else the head of government, :186-205); writes `life.contacted-official` (:49-52). Header :41: "NOT MODELED: what the contact said". Called from `migration/review.ts:270`.
- `src/simulation/office-workflow.ts:37 CASEWORK_MODES` (player-handles-all, staff-routine-player-exceptions, staff-handles-and-briefs), `:158 recordOfficeWorkflowPreference`; type `types.ts:5122`. A recorded mode does nothing today (`presentation/office-onboarding.ts:144`: "not completed constituent work").
- Duplicate choice lists: `presentation/office-onboarding.ts:69 OFFICE_CASEWORK_CHOICES` and `presentation/governing-office-desk.ts:126 CASEWORK_CHOICES`.
- `src/simulation/governing/office-staff-hiring.ts:115` (Constituent Caseworker), `:413 hireOfficeStaff`; `governing/office-staffing.ts:56`.
- `src/simulation/municipal-public-work.ts:243 MunicipalRole` (clerk, professional-manager), `:254 SEAT_ROLE_KINDS`: the town's own staff.
- `src/simulation/living-world/lived-outcomes.ts` (`livedOutcomesOf`, `officialAnsweringFor`), `src/simulation/law-exposure.ts` exposures, `official-view-reads.ts:168 viewOfOfficial`: the records a resident's reason comes from.
- `src/simulation/living-world/official-views.ts:168 officialViewReflectionHandler`, `:780 reactionLens`: how a resident's view of an official is formed and how strongly they react.
- `src/simulation/executive-governing-kernel-bank.ts:2582` (`constituent-request`, `referral-agency` fact keys) for executive offices.

## What to change

1. **The contact says something.** In `civic-actions.ts record()`, attach the resident's reason as source refs, chosen from the stake that pushed them over: the law exposure that cost them, the lived outcome, the vote or official they hold a strong view of, the group they joined against a law. A council resident with no view of anyone contacts the member for their ward where seats are by ward (seat record), else the head of government (as today). No matter is invented; a contact with no record reason is a general opinion call.
2. **A case at the office.** When the contacted official holds an office, write `office.case-opened` (event, keyed by the contact) naming the official, resident and reason. Open cases are what the office desk lists. No new record list.
3. **Who handles it.** Read the office's current casework mode. `player-handles-all`: every case is offered to Session 4's situation reader (phone, letter, visit at the office, the resident met in town). `staff-routine-player-exceptions`: a case is an exception when the record says so: the resident is someone the player knows, a reporter, donor or official; the reason is a pending measure; or the resident's view of the player is strongly negative. Exceptions go to the player; the rest to the handler. `staff-handles-and-briefs`: all to the handler. Handler = an office caseworker if one is employed; on a council with no staff, a referral to the town's clerk or manager (`MunicipalRole`).
4. **The office's usual approach.** A background case is answered by `evaluateDecision` (help / refer / cannot help / ignore) from: what the office can actually do about that reason (its powers), the handler's recorded skill and traits, and the office's usual approach = the player's own recorded answers to played cases of the same reason kind (latest first); before any history, the player character's traits. Writes `office.case-closed` with the answer.
5. **It moves what people think.** The closed case schedules the resident's reflection through `officialViewReflectionHandler`'s path: being helped, referred or ignored becomes a reason in their view of the official, scaled by `reactionLens`. b07's word of mouth carries it to their friends.
6. **Summary and one choice list.** The office desk shows exceptions waiting and a weekly line per background case ("Ana Reyes, about her rent: referred to the housing office"). Merge the two choice lists into one export used by both screens.
7. **Same path for every official.** NPC officials' cases always run in the background through steps 3–5 with their own staff and traits, so responsive officials earn views that Session 24's elections read.

## Must NOT build

- A random inbox, a fixed number of requests per week, or authored complaint letters.
- A request topic not traceable to a resident's record.
- A satisfaction meter or approval score; views change only through the belief writer.
- A second staff or delegation system; a council-only copy of the modes.
- A daily tick: cases are written when the quarterly civic review fires and closed when handled.

## Done when (proof in a played game)

- Random town, player on council with mode "handle it yourself": within a played quarter at least one named resident's case plays as a scene citing their real reason (print the source record); the player's answer is recorded.
- Switch to "routine handled, exceptions to me": next quarter, routine cases are referred to the town clerk in the background (printed), one exception (someone the player knows) plays.
- The background answer for a reason kind matches the player's earlier played answers for that kind.
- Residents helped vs ignored show different view records of the player.
- Tests: `constituent-cases.test.ts` (every case has a record reason; exceptions follow the record rules; same world → same answers; NPC official cases close in background), `civic-actions.test.ts` (ward routing).

## Depends on

Session 4 (scenes), Session 21 (lived outcomes, reflection writer in `official-views.ts`; coordinate before editing), Session 24 (elections read views), b07 (word of mouth), Session 23 (executive offices' desk).

## Open questions for the owner

None.
