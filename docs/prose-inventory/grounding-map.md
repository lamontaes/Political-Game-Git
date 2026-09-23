# Grounding and fact-packet map

For every prose family, the canonical data that licenses its factual claims.

**The rule this preserves, from merged PR #119: missing facts mean omit the
detail or withhold the scene.** Never a vague rescue — not "something", not
"the thing", not "somebody", not "whatever". Nothing in this map manufactures a
fact to make a scene eligible, and a family whose grounding the banks do not
declare is reported as undeclared rather than filled in from a guess.

## By family

| Family | Templates | Withheld | Undeclared grounding | Canonical concerns |
| --- | --- | --- | --- | --- |
| `campaign/campaign-status` | 27 | 0 | 0 | candidacy |
| `conversation/commit-contract` | 110 | 0 | 0 | — |
| `conversation/contextual-scene` | 257 | 0 | 0 | — |
| `conversation/conversation-subject` | 64 | 0 | 0 | — |
| `conversation/conversation-turn` | 24 | 0 | 0 | — |
| `governing/municipal-attendance-and-work` | 40 | 0 | 0 | activity-evidence, work-standing |
| `governing/municipal-authority-refusals` | 19 | 0 | 0 | — |
| `governing/municipal-institution-record` | 2 | 0 | 0 | activity-evidence |
| `governing/municipal-law-projection` | 48 | 0 | 0 | — |
| `governing/municipal-work-and-session` | 7 | 0 | 0 | activity-evidence, work-standing |
| `governing/municipal-workspace` | 81 | 0 | 0 | — |
| `legislative/measure-briefing` | 94 | 0 | 0 | measure |
| `life/adult` | 358 | 238 | 0 | colleague-identity, household-kinship, persistent-cast |
| `life/callback` | 39 | 0 | 0 | — |
| `life/episode` | 1020 | 204 | 0 | activity-evidence, age, colleague-identity, elapsed-time, enrollment, household-kinship, incident-locality, persistent-cast, work-standing |
| `life/formative` | 177 | 0 | 0 | persistent-cast |
| `life/introduction` | 12 | 0 | 0 | — |
| `life/life-continuation` | 12 | 0 | 0 | — |
| `life/office-answer` | 17 | 0 | 0 | candidacy |
| `life/opening-conversation-intents` | 17 | 0 | 0 | — |
| `life/opening-conversation-replies` | 62 | 0 | 0 | — |
| `life/personal-aims` | 19 | 0 | 0 | — |
| `life/press-disclosure` | 5 | 0 | 0 | — |
| `life/recall-cards` | 10 | 0 | 0 | — |
| `narration/connective` | 45 | 0 | 0 | elapsed-time |
| `narration/thread-recap` | 36 | 0 | 0 | — |
| `ordinary/work-item` | 4 | 0 | 4 | — |
| `setup/questionnaire` | 618 | 0 | 0 | — |
| `shell/art-preview` | 2 | 0 | 0 | — |
| `shell/save-transfer` | 35 | 0 | 0 | — |

## The concerns PR #119 named

These are the facts prose most often invents when the record is silent. The
count is how many families' declared grounding touches each one.

| Concern | Families touching it |
| --- | --- |
| Age | 1 |
| Enrollment | 1 |
| Work standing | 3 |
| Colleague or supervisor identity | 2 |
| Shift or activity evidence | 4 |
| Household and kinship | 2 |
| Persistent cast identity | 3 |
| Incidents and locality | 1 |
| Time elapsed | 2 |
| Candidacy, election and office | 2 |
| Legislative measure and chamber | 1 |

## Withheld scenes and the evidence each one is missing

442 templates across 41 distinct
missing-evidence reasons. Each reason is the bank's own, read from the stage's
`withheld` requirement rather than restated here.

- **adult.small-windfall** — A money scene needs the amount, the source and whether anything already claims it, and the world records no receipt this could read. Money that arrives from nowhere in no amount cannot be grounded.
- **adult.partner-plan** — A partnership does not establish two conflicting plans or an imminent decision. The plans and the partner proposal are missing.
- **adult.local-dispute** — A posted meeting and another household do not establish a proposal or its cost to that household. The agenda item and effects are missing.
- **adult.volunteer-ask** — A posted meeting and no civic participation do not establish a staffing shortage or a Saturday request. The organization and actual request must precede the option; joining an organization afterwards is not evidence.
- **adult.community-meeting** — A posted work item does not establish a meeting tonight, an available agenda item for these decisions or completed minutes to read. The meeting and document states needed by the choices are missing.
- **adult.debt-call** — A resource obligation need not be debt and establishes no payment demand or call. Debt terms, a demand and the resources needed by the payment choices are missing.
- **adult.incident-neighbour-help** — An active incident and another household do not establish comparative damage or a request for help. The impact, request and player knowledge are missing.
- **adult.incident-aftermath** — An active incident anywhere in the World does not establish local impact, recovery, or player knowledge. The affected household, recovery state and acquired knowledge are missing.
- **adult.promise-comes-due** — An active player commitment does not establish that it is due or conflicts with something else. The due terms and actual conflict are missing.
- **money.the-thing-you-are-behind-on/the-first-letter** — An open obligation is not a letter the player cannot pay; the missed-payment record is not read yet (dialogue review, 2026-09-23).
- **money.the-thing-you-are-behind-on/arrangement-held** — Eight months of payments are implied by a timer; no payment plan was recorded (dialogue review, 2026-09-23).
- **adult.work-rule-pressure** — Employment and a colleague do not establish a conflicting work rule or a senior request. The rule, conflict and request are missing.
- **adult.work-good-week** — Employment does not establish a successful week, completed work or available time. The achievements and circumstances are missing.
- **home.the-week-that-does-not-balance/it-was-taken-seriously** — Five months of chores are implied by a timer; no work was recorded (dialogue review, 2026-09-23).
- **adult.community-building** — Group participation does not establish a building closure, an expiring charge or who pays. The building decision and payment terms are missing.
- **adult.petition-ask** — Group participation does not establish a petition or a request to sign. The petition, request and disclosure terms are missing.
- **adult.care-request** — Kinship and no current care responsibility do not establish a care need or a discussion. A named recipient and actual care request are missing; a commitment written after choosing cannot establish them.
- **adult.family-request** — Kinship does not establish a two-week request or a conflicting plan. The request and its terms need an actual record.
- **growing-up.a-friend-over-years/dropped-pass** — Missing a recorded transit journey, stop and shared routine with this person; no transit mode or timetable is modeled.
- **kin.the-work-that-is-not-paid/the-family-shop** — Missing canonical family business/work relationship and unpaid weekend request; kinship is insufficient.
- **school.the-thing-you-got-blamed-for/the-commute** — Missing canonical transit mode, journey/timetable and shift end; a job plus an enrollment is not a commute or a clash (RETURN14 D).
- **work.the-money-nobody-counts/what-you-said-stuck** — Missing continued workplace discussion and identified questioner knowledge linkage.
- **kin.the-work-that-is-not-paid/the-third-weekend** — Missing continuing specific family-work commitment, active business/work context and performed weekends; earlier yes and elapsed time are insufficient.
- **civic.the-thing-nobody-else-turned-up-for/sandbag-line** — Missing relevant local flood/affected-place evidence and sandbag activity/participation context; an unrelated active incident is insufficient.
- **work.the-money-nobody-counts/pooled-tips** — Missing tipped workplace/pooling arrangement, cash removal and direct witness evidence.
- **school.the-thing-you-got-blamed-for/blamed** — No broken object, damage or blame is recorded before the scene is chosen (dialogue review, 2026-09-23).
- **civic.the-thing-nobody-else-turned-up-for/the-meeting** — No building, notice or meeting is recorded; choosing the scene used to create the group it describes (dialogue review, 2026-09-23).
- **political.what-your-name-is-for/the-approach** — No party, district history or approach by a party member is recorded (dialogue review, 2026-09-23).
- **home.the-week-that-does-not-balance/the-first-time-it-is-said** — No record divides the household's chores or time, so nobody can be right that the week does not balance (dialogue review, 2026-09-23).
- **work.where-you-stand-there/the-rule-and-the-person** — No workplace rule, case or affected person is recorded (dialogue review, 2026-09-23).
- **home.someone-is-not-all-right/noticing** — Nothing records the peer's late returns, curfews or whereabouts (dialogue review, 2026-09-23).
- **adult.friend-good-news** — Prior interaction does not establish good news or an invitation. The actual news and invitation are missing.
- **adult.work-colleague-struggling** — Shared employment does not establish a colleague difficulty, a disclosure, or the player knowing about it. Those facts are missing.
- **adult.work-credit** — Shared employment does not establish authorship, misattributed credit or who heard the claim. Those occurrences need records.
- **adult.housing-cost-change** — Tenure and a housing payment do not establish an increase. Changed payment terms and notice to the player are missing.
- **growing-up.a-friend-over-years/the-one-you-did-not-go-with** — The friend's return is implied by a timer, and the branch collapses different earlier choices (dialogue review, 2026-09-23).
- **work.where-you-stand-there/the-offer** — The job offer is implied by a timer; no offer or employer is recorded (dialogue review, 2026-09-23).
- **home.someone-is-not-all-right/it-got-worse** — The late-night call is implied by a timer, not recorded, and the branch ignores what the player actually chose (dialogue review, 2026-09-23).
- **adult.household-repair** — The scene depends on a specific broken household object, and the world keeps no record that could name one. Until a canonical household object or repair record exists, an unnamed broken 'something' cannot be grounded, and a prettier synonym for 'thing' would not ground it either.
- **adult.unexpected-expense** — The scene depends on a specific object having broken and on the month's arithmetic, and the world records neither objects nor monthly amounts. An unnamed broken 'something' with an unstated cost cannot be grounded.
- **adult.housing-repair-standoff** — The scene depends on a specific unrepaired defect and a recorded repair-responsible counterpart, and the world contains neither: dwellings carry no defect records and tenures name no landlord. Withheld rather than rewritten around an unnamed broken 'something'.

## Families whose grounding the banks do not declare

- `ordinary/work-item` — The item is offered from an open ordinary-life day; the bank declares no further fact requirement.

An undeclared dimension is a question for the prose migration to answer at the
bank, not a hole for this harness to fill.
