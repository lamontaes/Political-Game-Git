# B06 Constituents: how your office handles them

Bank id b06 (spec file `b06-constituents-how-your-office-handles-them.md`) · Phase P1 (council journey) · Unlocks step 8: "people bring it up" and step 9: "next election runs on the record" (cases are how residents form views of you).
Code checked at origin/main 1ee0abcda.

## What the player experiences

Once you hold office, people reach out, often. A neighbor whose rent jumped after a law passed calls. A man who lost his job stops you at the diner. A woman furious about your vote writes a letter. You decide how your office handles it: take every one yourself, let others handle the routine ones and bring you the unusual ones, or let others handle everything and tell you what happened. On a town council you usually have no staff, so "others" means the town's clerk and the departments you refer people to; higher up it means caseworkers. Cases that come to you play as short scenes and what you say is remembered. The rest are handled in the background the way your office usually handles that kind of request, and you get a short summary. How you treat people changes what they think of you and what they tell their friends.

## Owner decisions it rests on

- "Constituents: often; player decides how their office handles them (self, delegate...); most simulated in background from the office's usual approach."
- Staff results come from skill, potential, personality and passion (Register line 30).
- Zero dice. Emergent, not authored (no random inbox, no authored letters). One rule for every office level. Nothing blank: no matter is invented, a contact with no record reason is a general opinion call. One writer per kind of record. Delete what you replace.

## Existing code to extend (verified)

- `src/simulation/living-world/civic-actions.ts:165 reviewTownCivicActions`. Quarterly pass; each adult resident's stake (`civicStake`) decides via `passesMeasure(stake, "contacted", today)` whether they contact an official (strongest viewed official, else head of town via `localHeadOfGovernment`, else the governor); `:262 record()` writes the event named at `:50` (`life.contacted-official`) with participants resident (focus:subject) and official (focus:object). The header at `:42` says "NOT MODELED: what the contact said" (the spec said :41). Called from `src/simulation/migration/review.ts:270`. Seam: `record()` and the stake that passed.
- `src/simulation/office-workflow.ts:37 CASEWORK_MODES` (player-handles-all, staff-routine-player-exceptions, staff-handles-and-briefs), `:158 recordOfficeWorkflowPreference` (refuses a missing voting mode for a legislative seat at :182 and checks the casework mode at :186). A recorded mode does nothing today: `src/presentation/office-onboarding.ts:144` comment "A recorded casework preference is not completed constituent work."
- Duplicate lists: `src/presentation/office-onboarding.ts:69 OFFICE_CASEWORK_CHOICES` and `src/presentation/governing-office-desk.ts:126 CASEWORK_CHOICES` (labels differ: "Handle casework yourself" vs onboarding's; the order also differs). One export replaces both.
- `src/simulation/governing/office-staff-hiring.ts:116` ("Constituent Caseworker" title) and `:413 hireOfficeStaff`; `office-staffing.ts` (not re-read; confirm the :56 cite).
- `src/simulation/municipal-public-work.ts:237 MunicipalRole` (type), `:254 SEAT_ROLE_KINDS`, `:171 COUNCIL_SEAT_ROLES`: the town's own clerk and manager roles (the spec said :243).
- `src/simulation/living-world/lived-outcomes.ts:124 livedOutcomesOf`, `:135 officialAnsweringFor`; `src/simulation/law-exposure.ts` exposures; `src/simulation/official-view-reads.ts:168 viewOfOfficial` (spec's path was under living-world: wrong).
- `src/simulation/living-world/official-views.ts:168 officialViewReflectionHandler`, `reactionLens` (used at :595 and :643), `:301 peopleKnownTo`.
- `src/simulation/executive-governing-kernel-bank.ts:2582`: executive offices' `constituent-request` and `referral-agency` fact keys.
- `src/simulation/decisions.ts:66 evaluateDecision`; `src/simulation/world.ts:979 recordWorldEvent`; `src/presentation/english-composition.ts:215 composeGroundedLine`.
- Newer code covering part: none. Grep for `office.case-opened`, `case-closed` in src finds nothing.

## Build steps (each is one PR)

1. **The contact says something.** In `civic-actions.ts record()` attach the resident's reason as source refs taken from the stake that pushed them over: the law exposure that cost them, the lived outcome, the vote or official they hold a strong view of, the group they joined against a law. A council resident with no view of anyone contacts the member for their ward where seats are by ward (seat record), else the head of government as today. A contact with no record reason is recorded as a general opinion call. Must NOT: invent a topic.
2. **A case at the office.** When the contacted official holds an office, write `office.case-opened` (event keyed by the contact) naming official, resident and reason. Open cases are what the office desk lists. No new record list.
3. **Who handles it.** Read the office's current casework mode. `player-handles-all`: every case is offered to Session 4's situation reader (phone, letter, office visit, the resident met in town). `staff-routine-player-exceptions`: a case is an exception only when the record says so: the resident is someone the player knows, a reporter, donor or official; the reason is a pending measure; or the resident's view of the player is strongly negative. Exceptions go to the player, the rest to the handler. `staff-handles-and-briefs`: all to the handler. Handler = an employed office caseworker, else on a council with no staff the town's clerk or manager (`MunicipalRole`).
4. **The office's usual approach.** A background case is answered through `evaluateDecision` (help / refer / cannot help / ignore) from what the office can actually do about that reason (its powers), the handler's recorded skill and traits, and the office's usual approach, which is the player's own recorded answers to played cases of the same reason kind (latest first); before any history, the player character's traits. Writes `office.case-closed` with the answer.
5. **It moves what people think.** A closed case schedules the resident's reflection through the existing `officialViewReflectionHandler` path: being helped, referred or ignored becomes a reason in their view, scaled by `reactionLens`. b07's word of mouth carries it to their friends. Coordinate with Session 21 before editing `official-views.ts`.
6. **Summary and one choice list.** The office desk shows exceptions waiting and a weekly line per background case ("Ana Reyes, about her rent: referred to the housing office"). Merge the two casework choice lists into one export used by both screens. Replaces: `OFFICE_CASEWORK_CHOICES` and `CASEWORK_CHOICES` (delete one, point both screens at the survivor).
7. **Same path for every official.** NPC officials' cases run in the background through steps 3-5 with their own staff and traits, so responsive officials earn views that Session 24's elections read.

## Must not build

- A random inbox, a fixed number of requests per week, authored complaint letters.
- A request topic not traceable to a resident's record.
- A satisfaction meter or approval score; views change only through the belief writer.
- A second staff or delegation system; a council-only copy of the modes.
- A daily tick: cases are written when the quarterly civic review fires and closed when handled.
- New screens: the existing office desk gets lines and the choice list; no new UI the owner has not approved.

## Research tables

Nothing in the repo gives casework volume; the game's quarterly review makes volume come from each resident's stake (emergent), so no volume table is needed and none should be added. In the repo: research request `docs/research/requests/elected-office-staff-by-level.json` (open question: who has staff by level, including places where council members have none; it is the reason council seats use the town clerk) and `what-a-town-council-member-does.json` (recommends typical council work everywhere, labeled typical). No web search was run: the numbers this build needs are none, because handler, powers and skill come from records. Where a place lacks a clerk role in its record, treat the head of government's office as the handler (one rule), marked estimated.

## Done when

Random town, player on council with mode "handle it yourself": within a played quarter at least one named resident's case plays as a scene citing their real reason (print the source record); the player's answer is recorded. Switch to "routine handled, exceptions to me": next quarter routine cases are referred to the town clerk in the background (printed), and one exception (someone the player knows) plays. The background answer for a reason kind matches the player's earlier played answers for that kind. Residents helped versus ignored show different view records of the player.
Tests: `src/simulation/constituent-cases.test.ts` (every case has a record reason; exceptions follow the record rules; same world same answers; NPC official cases close in background); `civic-actions.test.ts` (ward routing, and that the reason attaches).

## Proof to post

Under `docs/codex/evidence/b06-constituents/`: screenshots of a played case scene, the office desk exceptions list, and the weekly background lines. Printed: one case's source record chain (stake, reason, event, handler, answer), two residents' view records before and after being helped vs ignored.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: none. Open items, each with its switch:

- Which cases are exceptions: one function `isExceptionCase(case)` holding the record rules (known person, reporter, donor, official, pending measure, strongly negative view); changing the rule edits that function only.
- Handler where a place has no clerk record: a data row `defaultCaseHandlerRole` per government type, estimated; the handler lookup reads it.
- If Session 4 scenes or Session 21's reflection writer have not landed: build steps 1, 2, 3 (routing), 4, 6, 7 now; step 5 calls a stubbed `scheduleViewReflection(resident, official, reason)` that Session 21's writer replaces.
