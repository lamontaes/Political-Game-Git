# 92H Executive-Governing Current-Mechanics Wave

Status: **Active. Additive and headless; not player-visible; not merged.**

Base: accepted `main` at `982f613a9737e25e506dc430e4f6e121dd72b3ca` (the merge
of PR #102).

## Assignment

Compile the twenty-four 92H kernels marked
`IMPLEMENTABLE_WITH_CURRENT_MECHANICS` into executable structures built from
mechanics already on accepted `main`, without waiting for 92K national
executive-authority completeness, without touching the open owner-play
ownership surface, and without colliding with the open executive-authority
substrate.

Research consumed:

- `92H_EXECUTIVE_GOVERNING_MACHINE_INVENTORY.json` — Drive
  `1jFw7lcs_C5JRtF1ypTs-fmsK3PtZlbOr`, generator `92h-inventory-v1`, as-of
  2026-09-06, content digest
  `6c29bb4283f6f9ac85d74d2a8ce4c48001756c30cf5dbc52e0bd2e4e09634447`.
  Seventy kernels: 24 implementable, 41 `NEEDS_MECHANIC`, 5 `RESEARCH_GAP`.
- `92H_EXECUTIVE_GOVERNING_SEED_BANK` — Drive
  `1b9Z1QZP-3xGhhpjlvtUrBHBYaPffiwAq`. Generated from the same data as the
  inventory; read for cross-check, and it agrees row for row.
- `92H_EXECUTIVE_GOVERNING_GAMEPLAY_WORKFLOW_RESEARCH_REPORT` — Drive
  `1au79c5olu4dNkVZTOyt01KQNfg3IpJ8f`.

The twenty-four rows were parsed from the machine artifact, not from the
prose family list in the task.

## The twenty-four compiled kernels

| Kernel      | Family | Title                                                                   | Scope                 |
| ----------- | ------ | ----------------------------------------------------------------------- | --------------------- |
| `92H-K-001` | WF-01  | Decision memorandum reaches the governor                                | GENERIC               |
| `92H-K-002` | WF-01  | Chief-of-staff gate: what reaches the governor at all                   | GENERIC               |
| `92H-K-003` | WF-01  | Cabinet meeting as information and coordination forum                   | GENERIC               |
| `92H-K-004` | WF-01  | Periodic written reporting from agencies                                | GENERIC               |
| `92H-K-030` | WF-04  | Enrolled bill presented: review and sign/veto/inaction                  | JURISDICTION-SPECIFIC |
| `92H-K-033` | WF-04  | Veto message drafting and delivery                                      | JURISDICTION-SPECIFIC |
| `92H-K-040` | WF-05  | Agency legislative proposals central clearance                          | GENERIC               |
| `92H-K-041` | WF-05  | Sponsor selection and testimony/lobbying policy                         | GENERIC               |
| `92H-K-102` | WF-11  | Annual federal grant application report from agencies (Texas pattern)   | JURISDICTION-SPECIFIC |
| `92H-K-131` | WF-14  | Audit finding requires a corrective action plan                         | GENERIC               |
| `92H-K-140` | WF-15  | Agency raises an implementation problem through its liaison             | GENERIC               |
| `92H-K-141` | WF-15  | Cabinet conflict between two agencies requiring escalation              | GENERIC               |
| `92H-K-142` | WF-15  | Performance-measure review flags a program                              | GENERIC               |
| `92H-K-153` | WF-16  | Congressional delegation and federal agency liaison request             | GENERIC               |
| `92H-K-160` | WF-17  | Constituent service request routed through agencies                     | GENERIC               |
| `92H-K-161` | WF-17  | Policy correspondence volume on a pending bill                          | GENERIC               |
| `92H-K-170` | WF-18  | Weekly strategic scheduling decision                                    | GENERIC               |
| `92H-K-171` | WF-18  | Communications decision after an official action                        | GENERIC               |
| `92H-K-172` | WF-18  | Press inquiry about a matter the governor has not yet decided           | GENERIC               |
| `92H-K-181` | WF-19  | Governor's office review of agency consultant contracts (Texas pattern) | JURISDICTION-SPECIFIC |
| `92H-K-201` | WF-21  | Continuity-of-government plan review                                    | GENERIC               |
| `92H-K-210` | WF-22  | Family event vs official demand on the same evening                     | GENERIC               |
| `92H-K-211` | WF-22  | Executive residence and protection ground rules                         | GENERIC               |
| `92H-K-212` | WF-22  | Long stretch with no dramatic event                                     | GENERIC               |

Four are jurisdiction-specific. Two of those (`92H-K-030`, `92H-K-033`) run
against the live legislative rule-pack registry; two (`92H-K-102`,
`92H-K-181`) require the caller to assert a jurisdiction requirement from
canonical records, because no pack on `main` carries it.

## Deliberately excluded

The forty-six gated kernels are carried as rows with the research's own
blockers and no definition. `executiveGoverningKernelById` returns null for
them and the compiler refuses any definition wearing their row. The whole
appointment, removal, executive-order, reorganization, budget-formulation,
budget-execution, emergency, rulemaking-oversight and clemency families stay
gated, and so do the item and amendatory veto paths, even where a live pack
knows a line-item veto exists.

Nothing from 92K V4 is ingested. It is a candidate input awaiting independent
source audit, and the compiler resolves every legal question from the live
rule-pack registry instead.

## Files

Added:

- `src/simulation/executive-governing-kernels.ts`
- `src/simulation/executive-governing-kernel-bank.ts`
- `src/simulation/executive-governing-kernels.test.ts`
- `tests/executive-governing-ownership-boundary.test.ts`
- `docs/systems/executive-governing-workflow-kernels.md`
- `docs/plans/active/executive-governing-current-mechanics-wave.md`

Edited: none. In particular `src/simulation/types.ts`, `world.ts`, `index.ts`,
`future-transitions.ts`, `src/player/**`, `src/presentation/**`, the
executive-authority modules, the bargaining modules and `package.json` are
untouched, and `tests/executive-governing-ownership-boundary.test.ts` measures
that against the base commit rather than asserting it in prose.

Because the shared index belongs to the owner-play branch, this system is not
exported from `src/simulation/index.ts`. Consumers import the two modules
directly.

## Stop conditions met

- Only the twenty-four current-mechanics rows compile.
- No canonical `World` or type union was enlarged; every plan step is the input
  to a creator that already existed.
- No probability, relationship score, legal clock, deadline, cadence, power or
  agency outcome is asserted.
- No player-facing prose is produced.

## Next consumer seam

After PR #85, PR #99 and PR #101 are accepted:

1. Export the two modules through `src/simulation/index.ts` in the merge-train
   reconciliation, and register the recurring-cycle transition handler in the
   shared registry so a saved world carrying a cycle can advance without the
   caller composing a registry.
2. Route compiled plans through the accepted civic-prose skill to render the
   developer labels into second-person text, keeping the labels as the
   structured fact packet the prose is generated from.
3. Promote `92H-K-102` and `92H-K-181` from supplied-canonical-fact gating to
   rule-pack resolution once an executive-authority substrate carries the
   Texas reporting and contract-review requirements with audited provenance.
4. Revisit `92H-K-030`'s follow-up omission when calendar semantics land: the
   action window becomes a real due item the day day-counting exclusions and
   post-adjournment windows are resolved per jurisdiction.
5. Take the `NEEDS_MECHANIC` families in the order their record families
   arrive: appointments and confirmation first (they reuse the legislative
   voting record), then executive orders, then appropriation-bearing budget
   work.
