# Executive-Governing Workflow Kernels (92H, current mechanics)

Status: **Additive headless compiler. Not player-facing, and not exported
through the shared simulation index.**

Modules: `src/simulation/executive-governing-kernels.ts` (types, compiler,
applier), `src/simulation/executive-governing-kernel-bank.ts` (the 92H
inventory as data), `src/simulation/executive-governing-kernels.test.ts`.

## What this is

The 92H research lane described how a governor's office actually disposes of
work: seventy kernels across twenty-two workflow families, each with its roles,
its trigger, its lawful alternatives, its delegated steps, and the sources
behind them. Twenty-four of those kernels were marked
`IMPLEMENTABLE_WITH_CURRENT_MECHANICS`. This system compiles exactly those
twenty-four onto the records the repository already has, and refuses the other
forty-six.

It is a compiler, not an executive simulation. Nothing here decides what a
governor does, how likely anything is, or what an agency achieves.

## What a plan is

A plan is a list of steps, and every step is literally the input to a canonical
creator that already existed before this wave:

| Step kind               | Canonical creator         |
| ----------------------- | ------------------------- |
| `work-item`             | `createWorkItem`          |
| `scheduled-activity`    | `createScheduledActivity` |
| `future-due-item`       | `scheduleFutureDueItem`   |
| `historical-event`      | `recordWorldEvent`        |
| `evidence-artifact`     | `recordEvidenceArtifact`  |
| `executive-disposition` | `recordExecutiveAction`   |

`applyExecutiveGoverningPlan` is a switch over those six calls and nothing
else. That is the whole runtime, and it is why a second task list, a second
calendar or a second scheduler cannot hide in this system: there is nowhere for
one to live. A test asserts the step vocabulary is exactly these six.

Compilation takes no world. It takes a context of facts the caller has already
read out of one, plus the world's id and its canonical moment, and produces the
same plan every time. Canonical ids are a pure function of the world id and a
stable key, so a plan can name the activity it is about to create. Applying a
plan to a different world, or on a different date, is refused.

## The invariant shell

92H's generic office-practice shell has nine stages:

`intake → staff-analysis → counsel-fiscal-review → decision-memorandum →
chief-of-staff-gate → player-decision-slot → communication →
implementation-work → follow-up`

Every kernel is measured against all nine. Each stage is bound one of three
ways:

- **compiled** — a canonical record carries it;
- **deferred** — another 92H kernel owns it, named by id (the communication
  stage of most kernels defers to `92H-K-171`, so the office has one press
  shop rather than eleven);
- **omitted** — nothing carries it, with a reason from a closed vocabulary:
  `kernel-carries-no-such-stage`, `no-record-family-on-accepted-main`,
  `jurisdiction-rule-input-unresolved`, `cadence-not-in-canonical-records`,
  `deadline-not-sourced`, `downstream-record-owned-by-another-system`.

The vocabulary is closed on purpose. "This kernel has no counsel review" and
"nobody has sourced how long the Governor has" are different claims, and free
text would let them blur together.

## Refusing rather than inventing

The compiler fails closed, and each refusal names why:

| Reason                                            | Meaning                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `kernel-not-implementable-with-current-mechanics` | 92H did not mark this row implementable.              |
| `missing-canonical-fact`                          | The caller did not supply a fact the kernel requires. |
| `unbound-role`                                    | No person is bound to a role the kernel's steps use.  |
| `missing-activity-window`                         | A compiled activity has no calendar window.           |
| `missing-due-date`                                | A compiled cadence has no supplied date.              |
| `missing-event-anchor`                            | An evidence artifact names no event it documents.     |
| `measure-context-missing`                         | A presentment kernel was given no bill.               |
| `jurisdiction-authority-unavailable`              | No such rule pack is registered.                      |
| `jurisdiction-authority-unresolved`               | The pack has not resolved the rule.                   |
| `disposition-option-unavailable`                  | The office asked for a path the pack does not grant.  |

No cadence, deadline, probability, relationship score, power or outcome is
asserted anywhere in this system. Where 92H recorded an unknown, the unknown
survives into the code.

## Jurisdiction authority

Office practice is portable; law is not. A kernel's `authority` is one of:

- `none` — generic office practice, runs wherever there is an office;
- `legislative-rule-pack` — resolved from the live registry by pack id at
  compile time, through `rulePackById`. A caller cannot pass a pack object: a
  fabricated pack with a plausible id would otherwise grant a Governor a power
  the jurisdiction has never had;
- `supplied-canonical-fact` — the practice exists only where a jurisdiction
  requires it and no pack on `main` carries that requirement, so the caller
  must assert it from canonical records or the kernel does not compile.

### The regular-veto seam

`92H-K-030` is the only kernel in this wave that touches a legal act.
`resolveExecutiveDispositionOptions` reads the live pack and returns what is
available and what is withheld, with a reason:

- **available**: `sign` and `veto-with-message`, wherever the pack knows that
  measures are presented.
- **withheld `rule-unknown`**: Kentucky has not resolved what becomes of a bill
  the Governor neither signs nor returns, so letting one become law without
  signature is not on offer there.
- **withheld `record-family-absent`**: Nebraska _has_ resolved it — and it is
  still withheld, because no executive-disposition record on accepted `main`
  accepts that act. Missing law and a missing mechanic are different failures
  and are reported differently.
- **withheld `record-family-absent`**: item and amendatory vetoes, everywhere,
  including packs whose `lineItemVeto` rule is known true. Those are
  `92H-K-031` and `92H-K-032`, both `NEEDS_MECHANIC`.

No action-deadline due item is created. Day-counting exclusions are unresolved,
Kentucky's post-adjournment window is UNKNOWN in the live pack, and the
repository claims no action deadline until there are calendar semantics.

## Recurring cycles

Cabinet meetings, agency reporting and the annual federal-grant report are the
same shape: a date arrives and a piece of work appears. That is `FutureDueItem`
plus `WorkItem`, so there is one transition key —
`executive-governing:recurring-office-cycle` — and one handler, not a scheduler
per kernel. The handler creates the work item the cycle was always going to
produce and resolves the due item. It decides nothing about whether the report
was good, late, or ever arrived.

The handler is exported rather than registered globally, because the shared
transition registry is another branch's surface.

## No player-facing prose

The accepted civic-prose system renders a governor's day into English, and it
is still awaiting acceptance. Writing sentences in a headless compiler would be
freestyling game copy. Every title and summary this system produces is a
structured developer label with a grammar narrow enough to check —
`DEVELOPER_LABEL_PATTERN` and `DEVELOPER_SUMMARY_PATTERN` — and the tests check
every one of them, including that no second-person address appears anywhere.

## Coverage

`executiveGoverningCoverageReport()` returns all seventy kernels as
`COMPILED_CURRENT_MECHANICS`, `NEEDS_MECHANIC` or `RESEARCH_GAP`, with the
research's own blockers attached to the gated rows. It is derived from the
transcribed rows and from whether a definition exists, so it cannot drift away
from what the compiler will accept. It is a view of the research, not a second
research authority: changing that function cannot promote a kernel.

## Boundary

This system is deliberately not exported through `src/simulation/index.ts`,
which belongs to the open owner-play repair branch. Consumers import the two
modules directly until the merge train reconciles. It imports nothing from the
executive-authority substrate, the campaign machinery, the player layer or the
presentation layer, and a test enforces that.
