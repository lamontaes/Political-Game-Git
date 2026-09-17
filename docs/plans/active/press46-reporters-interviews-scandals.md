# PRESS46 — recurring outlets, interviews, leaks and record-backed financial matters

Owner: PRESS lane (Claude Code local session `political-game-claude-runtime-proof-85`).
Authority: CRUNCH46 §00–00B, §10 PRESS, §13 (`crunch46-provisional-v1`), and ALIVE44
chunks 4 (allegations/investigations) and 5 (media ecology). Base: `main` `fed321f7`
plus PEOPLE's frozen claim-stance commit `e1145f7d`.

## Boundary

PRESS consumes canonical World facts. It is not a second News, event,
relationship or money engine.

- Occurrences stay ordinary `HistoricalEvent`s. Publications go through the one
  `publishPublicEvent` / `correctPublication` writer.
- Knowledge goes through `recordEventKnowledge`. Player assertions go through
  PEOPLE's `recordPlayerClaim` (stance: truthful / deceive / from-memory / evade).
- Money goes through the existing resource-flow writer. GOVERNING owns the
  labeled public-fund writer.
- Authority for consequences is GOVERNING's `canInstitutionAct`. Until it lands,
  a local stub answers `unknown`, so no sanction is surfaced.
- PRESS adds one optional, sequenced history family, `history.pressRecords`: a
  typed discriminated union with its own integrity check, registered beside
  publications. Old saves read it as empty.

## Records (`src/simulation/press/records.ts`)

| kind                   | meaning                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `media-outlet`         | persistent fictional product: organization, scope, geography, mediums, beats, resource tier (capacity 1/3/8), cadence |
| `reporter-role`        | a persistent Person's journalism work role at one outlet, with beats and geography                                    |
| `story-lead`           | an actual event/record/tip reaching an outlet, with route and basis                                                   |
| `story-disposition`    | assign / queue / decline / response-requested / hold / narrow / publish / follow-up / correct                         |
| `source-agreement`     | ground rules agreed BEFORE disclosure (on-record, background with exact label, deep-background, off-record)           |
| `source-contribution`  | what a source actually said or leaked under that agreement                                                            |
| `financial-occurrence` | the underlying misconduct (M1 / M2 / M7), linked to real flows and a private event                                    |
| `matter`               | the matter as a whole; `occurrenceId` may be null (false allegation)                                                  |
| `matter-allegation`    | a public or complaint allegation, which is never itself a finding                                                     |
| `matter-evidence-link` | an evidence artifact's bearing on the matter                                                                          |
| `matter-proceeding`    | a jurisdiction-specific procedure (FEC, KY KLEC, simulated audit/inquiry)                                             |
| `proceeding-step`      | each dated step, with visibility and outcome                                                                          |
| `matter-response`      | subject / party / staff / contact / reporter responses, each built from that person's own knowledge                   |

## Lifecycle

M2: event → lead → assignment (capacity-bound) → response request (when the
story portrays a person negatively) → publish / hold / narrow / decline →
follow-up / correction.

- Opening News writes nothing.
- The cadence is one weekly desk sweep plus exact due items for response windows
  and procedure deadlines. Nothing runs on render.

M4: the four core facts never collapse:

- occurrence (may be absent)
- evidence
- public allegation
- institutional status

Procedure adapters are data, not one universal state machine:

- FEC: sworn complaint → notice → 15-day response → reason-to-believe or
  dismissal → investigation → conciliation → closure; the public file is released
  only at closure.
- KY KLEC: 10-day service, 20-day answer, confidential preliminary inquiry,
  dismissal or probable cause.
- Simulated inquiry: explicitly disclosed, with no sanction power.

## Provisional policy (§13)

Stored as `crunch46-provisional-v1`:

- media capacity small 1 / standard 3 / major 8;
- a weekly editorial sweep;
- authored intervals labeled as authored where no rule gives a deadline;
- no reputation multiplier, poll, reach number or approval delta.

## Proof (tests in `src/simulation/press/*.test.ts`)

- the same reporter twice
- publish-one / hold-one
- confidential and off-record control
- no response is not guilt
- a lie is distinguished from a mistake
- a true hidden occurrence stays unknown
- a false public allegation is dismissed without misconduct
- an established-finding branch
- resources move exactly once
- consequences only with valid authority
- no source leakage in person-card or map projections
- the same outlet, person and history survive a save round trip

## Interfaces owed or received

- PEOPLE `claim-stances.ts` @ `e1145f7d` (received).
- GOVERNING `recordOutsideMandatePublicPayment` and `canInstitutionAct`
  (requested; stubbed in `press/governing-adapter.ts`).
- WORLD: schema registration (requested; minimal additive lines in `world.ts`,
  `types.ts`, `opening-life.ts`).
- CAMPAIGN: expenditure flows unchanged; deliberate M1 misuse uses the existing
  resource-flow writer until CAMPAIGN owns a labeled action.
- CHANGE: `economy.release-published` events (R5 leads).
- CRISIS: public events (R7 leads).
- UI: `PressDeskPanel` mounted inside `PressWorkspace` only.

## Merge requirement with WORLD (claude/world46-seeded-parties @ 02ba5830)

A legacy replay descriptor (no `worldOpeningVersion`) must rebuild the
`fed321f7` world byte-for-byte; `src/presentation/world46-opening.test.ts` pins
those hashes. When this branch meets WORLD, gate the press opening in
`generateOpeningLife` like the other current-opening steps. The gate means old
replays get no outlets and no weekly desk sweep:

```ts
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  worldOpeningVersionOf,
} from "../simulation";

// wrap the ensureLivingWorldDevelopments(...) result:
(world) =>
  worldOpeningVersionOf(world) === CRUNCH46_WORLD_OPENING_VERSION
    ? ensurePressOpening(world, game.playerPersonId)
    : world;
```

The helpers do not exist on `fed321f7`, so this branch cannot carry the gate
before the merge.
