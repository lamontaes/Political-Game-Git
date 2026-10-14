# Optional difficulty settings on top of the adaptive (Pennywise) challenge (bank id b25, phase ship 1.0: after the 1.0 core, last)

Verified against origin/main e403b9bfd (Oct 6). Bank spec: docs/codex/specs/bank/b25-optional-difficulty-settings.md.

## What the player experiences

The game already pressures each character where it hurts: the brother you protect, the donor you owe, the promise you made. On top of that, players choose how hard their life is, without the game cheating for or against them. Before you begin you can start in a more comfortable or tighter family (your parents' real jobs and savings differ, so the money is earned in the story, not handed over) and pick a gentler or tougher press corps (stricter or looser standards before they print an allegation, more or less dogged reporters). While playing you choose how often hard moments come (quiet, standard, relentless), how much your notebook reminds you of what your character knows (promises due, favors owed, what you learned about someone), and whether you play with free saves or one save you cannot reload. Votes, elections, prices and people's decisions are never tilted by a setting.

## Owner decisions it rests on

- Owner (this round): optional settings (more forgiving press, more money, and so on) on top of the adaptive challenge, after the 1.0 core, last. Nothing here blocks anything else.
- OCD-LIFE-005: adaptive presentation selects salient, independently eligible situations; it must not manufacture a crisis, suppress an independent event or alter an outcome. Quiet lives stay legitimate.
- Register: "Do not impose mandatory Ironman or prohibit earlier-save loading" (one-save only as an option). Custom Start keeps premises deliberate; the world becomes canonical at Begin.
- Fixed: zero dice; no fixed percentages; nothing blank (a setting always has a default); one rule for all places; one writer per record kind; delete what you replace.

## Existing code to extend (verified on e403b9bfd)

- `src/simulation/player-model.ts` (header: chooses what is offered, never outcomes).
- `src/simulation/situation-selection.ts`: `PACING_PENALTY :183` (1.2), `MONOTONY_PENALTY :184` (0.45), `PACING_WINDOW :185`, `rankSituations :199`, `selectSituation :235`; used at :320. Callers: `presentation/adult-life.ts`, `formative-play.ts`, `life-story.ts`. Re-grep line numbers when you start.
- Setup: `src/presentation/new-game.ts:139 NewGameSetup`; `src/player/SetupScreen.tsx`; `src/simulation/setup-priors.ts:65 setupPriorsOf` (setup answers on the World, never feeding generators).
- Options screen: `src/player/ShellWorkspaces.tsx:1861 OptionsWorkspace` (bank cite :1866 is 5 lines off; its own rule: only settings something reads).
- Press: `src/simulation/press/outlets.ts:452 ensurePressMediaOpening`, `:60 OutletPlan` (interface), `:711 hireReporter` (not exported), `press/desk.ts:920 editorialDecision` (not exported; `corroborated` at :906-928 gates full publication), `:286 assignStory`.
- Money: `src/simulation/starting-money.ts:83 ensureStartingPersonalMoney`; `src/simulation/people-family.ts:159 recordFamilyAddition` (bank cite :191 is stale).
- Saves: `src/player/SavesScreen.tsx`, `src/persistence/sqlite-world-repository.ts`.
- Notes: `presentation/person-dossier.ts`, `simulation/favors.ts:391 favorsBetween`, `simulation/people-promise.ts`.
- World type: `src/simulation/types.ts:5764 export interface World` (schemaVersion 15). No `playSettings` and no difficulty code exists on main (grep clean).

## Build steps (one PR each)

1. **Where settings live.** `playSettings?: { challenge, notes, saves, premises }` on `World`, written once at Begin from `NewGameSetup`, changed afterward only through `setPlaySetting(world, key, value)` (records a private event). Old saves read defaults (standard, full notes, free saves). Settings never reach `world.seed` or any generator stream after Begin. Must not: a second settings store.
2. **Challenge intensity (changeable any time).** `quiet | standard | relentless` maps to a lookup of pacing weights in `situation-selection.ts` that replaces direct reads of `PACING_PENALTY` and `MONOTONY_PENALTY` (standard keeps today's values). It reorders the SAME eligible candidates; it never adds one, removes an independent world event, or touches resolution. Quiet may return null more often. Scene selection (Session 4, `life-scene-flow.ts`) ranks through `selectSituation` so it applies there too.
3. **Notes (changeable any time).** `full | light | none` sets what the notebook and dossier show unprompted: full lists known stakes, promises due and favors owed; light shows them only when you open a person; none shows only what the character could recall in conversation. Every line comes from the character's own knowledge records; nothing hidden is revealed at any setting.
4. **Saves (chosen at new game, fixed).** `free | one-save`: one-save keeps a single slot overwritten on every save and hides reload of earlier snapshots in `SavesScreen`. Default free.
5. **Family money premise (new game only).** `comfortable | ordinary | tight` is an input to the Creator's family generation (Session 6's forks): it steers which parents' jobs and recorded pay the existing writers produce, so savings and the home follow from their history through `ensureStartingPersonalMoney`. No cash grant, no money after Begin.
6. **Press premise (new game only).** `gentler | realistic | tougher` sets each outlet's recorded editorial standard at founding (add the field to the outlet record in `ensurePressMediaOpening`; `editorialDecision` reads it for how much corroboration it needs before printing an allegation) and the temperament range `hireReporter` draws reporters from (persistence, conflict). From then on every story decision is the outlet's and reporter's own. Outlets founded later use the same premise.
7. **Screens.** One optional skippable "Difficulty" step on `SetupScreen` with defaults shown. `OptionsWorkspace` gets Challenge and Notes; premises and saves are read-only with a plain sentence ("Chosen when this life began"). Look comes from Session 3 / 14.

## Must NOT build

Any multiplier on votes, election results, prices, pay, odds of being caught, NPC opinions or decisions; rubber-banding toward a win rate or easy-mode bailouts; suppressing events the world produced; money or favors injected after Begin; premises changed mid-game; a second situation selector; dice; a visible difficulty score; mandatory Ironman.

## Research tables

None needed. Family money follows recorded parents' pay already in the world; the press standard is a recorded outlet field, not a number from outside. If a PR wants a numeric corroboration level, use the existing `corroborated` boolean and the ordinal levels the decision engine already has. Do not invent percentages.

## Done when (played-game proof)

- Same seed and place, two new games, comfortable vs tight: parents' recorded jobs and starting balance differ, both traced to recorded pay; nothing else differs at Begin except the household.
- Same seed, gentler vs tougher press: outlet records show different standards; a test allegation with one source is printed by the tougher outlet and held by the gentler, each with recorded reasons.
- Same world, quiet vs relentless: `rankSituations` gets the identical candidate list, the selected order differs, replaying the same choices gives identical outcomes.
- Notes none vs full: the dossier shows fewer reminders, and no line at either setting cites knowledge the character lacks.
- Tests: `play-settings.test.ts`, `situation-selection.intensity.test.ts`, `press-premise.test.ts`, `family-money-premise.test.ts`, `saves-one-slot.test.ts`; existing `situation-selection` and `decisions` tests unchanged.

## Proof to post

Per step: random place and seed, the printed two-game comparison, printed candidate lists and orders for quiet and relentless, outlet records with reasons, the delete list for each "Replaces:", `npm run typecheck` plus changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.
Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

- Open question: is "more money" a starting premise only (a) or also an ongoing option such as cheaper campaigns (b)? Switch: premise is built; an ongoing-cost setting is NOT built until answered, but `playSettings.premises` takes one more key and the cost readers are untouched. Default a.
- Open question: does one-save exist at 1.0? Switch: the `saves` setting is built with `one-save` hidden behind one constant `ONE_SAVE_OFFERED` (default false (the owner has not asked for a one-save mode; it stays off until he does), per the owner's "optional"); false removes the choice from setup and nothing else.
- Session 6 (Creator forks) not landed: build the premise as an input the family writer reads with default `ordinary`, and wire the fork when it lands.
