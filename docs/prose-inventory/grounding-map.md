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
| `campaign/campaign-status` | 23 | 0 | 0 | candidacy |
| `conversation/commit-contract` | 106 | 0 | 0 | — |
| `conversation/conversation-subject` | 67 | 0 | 0 | — |
| `conversation/conversation-turn` | 24 | 0 | 0 | — |
| `governing/municipal-attendance-and-work` | 37 | 0 | 0 | activity-evidence, work-standing |
| `governing/municipal-authority-refusals` | 19 | 0 | 0 | — |
| `governing/municipal-institution-record` | 2 | 0 | 0 | activity-evidence |
| `governing/municipal-law-projection` | 47 | 0 | 0 | — |
| `governing/municipal-work-and-session` | 7 | 0 | 0 | activity-evidence, work-standing |
| `governing/municipal-workspace` | 75 | 0 | 0 | — |
| `legislative/measure-briefing` | 93 | 0 | 0 | measure |
| `life/adult` | 384 | 287 | 0 | colleague-identity, household-kinship, persistent-cast |
| `life/callback` | 41 | 0 | 0 | — |
| `life/episode` | 1020 | 71 | 0 | activity-evidence, age, colleague-identity, elapsed-time, enrollment, household-kinship, incident-locality, persistent-cast, work-standing |
| `life/formative` | 177 | 0 | 0 | persistent-cast |
| `life/introduction` | 10 | 0 | 0 | — |
| `life/opening-conversation-intents` | 11 | 0 | 0 | — |
| `life/opening-conversation-replies` | 31 | 0 | 0 | — |
| `narration/connective` | 43 | 0 | 0 | elapsed-time |
| `narration/thread-recap` | 32 | 0 | 0 | — |
| `ordinary/work-item` | 4 | 0 | 4 | — |
| `setup/questionnaire` | 354 | 0 | 0 | — |
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
| Candidacy, election and office | 1 |
| Legislative measure and chamber | 1 |

## Withheld scenes and the evidence each one is missing

358 templates across 33 distinct
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
- **adult.old-favour-returns** — An earlier favour-family choice may be a refusal. It does not establish help given, a new larger request or a recurrence count. The actual prior action and new request are missing.
- **adult.help-with-strings** — Dependency does not establish an offer of help or the concrete problem it would solve. The offer and terms are missing.
- **adult.work-rule-pressure** — Employment and a colleague do not establish a conflicting work rule or a senior request. The rule, conflict and request are missing.
- **adult.work-good-week** — Employment does not establish a successful week, completed work or available time. The achievements and circumstances are missing.
- **adult.work-offer-elsewhere** — Employment does not establish another offer, better terms or coworkers being unaware. An actual offer and the player knowledge of it are missing.
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
- **adult.friend-good-news** — Prior interaction does not establish good news or an invitation. The actual news and invitation are missing.
- **adult.work-colleague-struggling** — Shared employment does not establish a colleague difficulty, a disclosure, or the player knowing about it. Those facts are missing.
- **adult.work-credit** — Shared employment does not establish authorship, misattributed credit or who heard the claim. Those occurrences need records.
- **adult.housing-cost-change** — Tenure and a housing payment do not establish an increase. Changed payment terms and notice to the player are missing.
- **adult.household-repair** — The scene depends on a specific broken household object, and the world keeps no record that could name one. Until a canonical household object or repair record exists, an unnamed broken 'something' cannot be grounded, and a prettier synonym for 'thing' would not ground it either.
- **adult.unexpected-expense** — The scene depends on a specific object having broken and on the month's arithmetic, and the world records neither objects nor monthly amounts. An unnamed broken 'something' with an unstated cost cannot be grounded.
- **adult.housing-repair-standoff** — The scene depends on a specific unrepaired defect and a recorded repair-responsible counterpart, and the world contains neither: dwellings carry no defect records and tenures name no landlord. Withheld rather than rewritten around an unnamed broken 'something'.
- **adult.household-money-shortfall** — The scene depends on the month's arithmetic having moved, and the world keeps no monthly income or spending record that could say so. Grounded money pressure lives in adult.debt-call and adult.housing-cost-change, which read recorded obligations.

## Families whose grounding the banks do not declare

- `ordinary/work-item` — The item is offered from an open ordinary-life day; the bank declares no further fact requirement.

An undeclared dimension is a question for the prose migration to answer at the
bank, not a hole for this harness to fill.
