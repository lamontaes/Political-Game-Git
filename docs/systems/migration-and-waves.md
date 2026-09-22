# Migration and society-wide waves

Owner request, 2026-09-22: moving and settlement patterns, and large waves
such as a second white flight or a Great Awakening. He chose people visibly
moving between towns and states as the first piece, because it informs the
second.

## What exists

- **Moves** (`src/simulation/migration/relocate.ts`). A household, or a person
  living alone, leaves one place for another on a date with a namespaced
  reason (`life-course:`, `work:`, `family:`, `cost:`, `wave:`, `custom:`).
  One `migration.moved` event per move. The current residence fact is closed
  and a new one opened, `homeJurisdictionId` follows, the household gets a
  superseding location, and open district memberships close.
  `relocateHousehold` is the single-move writer for scenarios and future
  player routes; `recordedMoves` reads every move back.
- **The monthly review** (`src/simulation/migration/review.ts`). Runs for
  lives opened at the current world version. In the player's town it steps
  the waves, reviews each adult once a year in their own month, moves the
  households that leave, and creates newcomers as `migration.arrived`.
- **Waves** (`src/simulation/migration/waves.ts`). A wave is a definition with
  causes, effects, a duration and a quiet period. Its life in a save is a
  public `migration.wave-began` event and a public `migration.wave-ended`
  event. `startWave` begins one on purpose.

## Where each piece plugs in

The authoritative list is `MIGRATION_SEAMS` in
`src/simulation/migration/contract.ts`, tested so every unbuilt seam carries
the blanket rule the code follows meanwhile. In summary:

| Seam                     | Built  | Rule today                                                                                                                  |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Residence records        | yes    | Fact, home, household location and district membership change together.                                                     |
| Who may move             | no     | Anybody with a job, enrollment, tenure, organization or party membership, dwelling or campaign stays, with their household. |
| Player household         | no     | Never moved by the simulation.                                                                                              |
| One member leaving       | no     | A household moves whole.                                                                                                    |
| Why people leave         | no     | Flat yearly chance, scaled by active waves.                                                                                 |
| Where people go          | no     | Own state or another state, drawn evenly.                                                                                   |
| Arrivals                 | yes    | Single adults at the departure rate. No household, no prior history.                                                        |
| Beliefs carried          | no     | A move changes no belief or affiliation.                                                                                    |
| Press                    | yes    | Waves are public events; ordinary moves are not.                                                                            |
| Wave causes              | partly | Scenario and recorded unemployment only; every other cause never fires.                                                     |
| Wave spread              | no     | One place, fixed intensity, fixed length.                                                                                   |
| Who a wave moves         | no     | Everyone in scope alike; nobody is selected by group.                                                                       |
| Wave beliefs and parties | no     | Recorded on the definition, applied to nobody.                                                                              |
| Modded waves             | no     | The catalogue is in source.                                                                                                 |
| Old saves                | no     | Not scheduled.                                                                                                              |

## Placeholders and research

Every number marked BLANKET in `review.ts` and `waves.ts` is a placeholder.
The real pace and causes are filed as `migration-rates-and-reasons` and
`society-wide-waves-causes-pace-scale` in `docs/research/requests/`.
