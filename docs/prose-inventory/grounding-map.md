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
| `conversation/commit-contract` | 76 | 0 | 0 | — |
| `conversation/conversation-subject` | 65 | 0 | 0 | — |
| `conversation/conversation-turn` | 24 | 0 | 0 | — |
| `legislative/measure-briefing` | 93 | 0 | 0 | measure |
| `life/adult` | 382 | 0 | 0 | colleague-identity, household-kinship, persistent-cast |
| `life/callback` | 30 | 0 | 0 | — |
| `life/episode` | 558 | 104 | 0 | activity-evidence, age, colleague-identity, elapsed-time, enrollment, household-kinship, incident-locality, persistent-cast, work-standing |
| `life/formative` | 177 | 0 | 0 | persistent-cast |
| `life/introduction` | 8 | 0 | 0 | — |
| `narration/connective` | 43 | 0 | 0 | elapsed-time |
| `narration/thread-recap` | 32 | 0 | 0 | — |
| `ordinary/work-item` | 4 | 0 | 4 | — |
| `setup/questionnaire` | 354 | 0 | 0 | — |

## The concerns PR #119 named

These are the facts prose most often invents when the record is silent. The
count is how many families' declared grounding touches each one.

| Concern | Families touching it |
| --- | --- |
| Age | 1 |
| Enrollment | 1 |
| Work standing | 1 |
| Colleague or supervisor identity | 2 |
| Shift or activity evidence | 1 |
| Household and kinship | 2 |
| Persistent cast identity | 3 |
| Incidents and locality | 1 |
| Time elapsed | 2 |
| Candidacy, election and office | 1 |
| Legislative measure and chamber | 1 |

## Withheld scenes and the evidence each one is missing

104 templates across 10 distinct
missing-evidence reasons. Each reason is the bank's own, read from the stage's
`withheld` requirement rather than restated here.

- **work.the-shift-you-were-asked-for/asked-by-a-colleague** — Missing canonical colleague coverage request and known funeral reason.
- **kin.the-work-that-is-not-paid/the-family-shop** — Missing canonical family business/work relationship and unpaid weekend request; kinship is insufficient.
- **work.the-shift-you-were-asked-for/called-in** — Missing canonical supervisor shift request and coursework/evening conflict.
- **school.the-thing-you-got-blamed-for/the-commute** — Missing canonical transit mode, journey/timetable and shift conflict.
- **work.the-money-nobody-counts/what-you-said-stuck** — Missing continued workplace discussion and identified questioner knowledge linkage.
- **kin.the-work-that-is-not-paid/the-third-weekend** — Missing continuing specific family-work commitment, active business/work context and performed weekends; earlier yes and elapsed time are insufficient.
- **work.the-shift-you-were-asked-for/it-came-back-round** — Missing current coverage need/rota and performed earlier shift help; choosing yes is not performance.
- **civic.the-thing-nobody-else-turned-up-for/sandbag-line** — Missing relevant local flood/affected-place evidence and sandbag activity/participation context; an unrelated active incident is insufficient.
- **school.the-thing-you-got-blamed-for/carrying-the-group** — Missing shared enrollment, assignment/deadline and contribution evidence.
- **work.the-money-nobody-counts/pooled-tips** — Missing tipped workplace/pooling arrangement, cash removal and direct witness evidence.

## Families whose grounding the banks do not declare

- `ordinary/work-item` — The item is offered from an open ordinary-life day; the bank declares no further fact requirement.

An undeclared dimension is a question for the prose migration to answer at the
bank, not a hole for this harness to fill.
