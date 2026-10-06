# Optional difficulty settings on top of the adaptive (Pennywise) challenge (bank id b25, phase Ship 1.0)

## What the player experiences

The game already pressures each character where it hurts: a dilemma about the brother you protect, the donor you owe, the promise you made. On top of that, players can now choose how hard their life is, without the game cheating for or against them. Before you begin, you can start in a more comfortable or a tighter family (your parents' real jobs and savings differ, so the money is earned in the story, not handed over) and pick a gentler or tougher press corps (newsrooms with stricter or looser standards before they print an allegation, reporters who are more or less dogged). While playing you can choose how often the game puts hard moments in front of you (quiet, standard, relentless), how much your notebook reminds you of what your character knows (promises due, favors owed, what you learned about someone), and whether you play with free saves or one save you cannot reload. Votes, elections, prices and people's decisions are never tilted by a setting.

## Owner decisions this rests on

- Roadmap (Ship 1.0): "Optional difficulty settings (more forgiving press, more money) on top of the adaptive challenge."
- OCD-LIFE-005: adaptive presentation selects salient, independently eligible situations; "must not manufacture a crisis, suppress an inconvenient independent event, alter an outcome to hit a drama quota"; "Quiet lives and uneventful intervals remain legitimate."
- OCD-SIM-003: Custom Start adds deliberate control over premises; the generated world becomes canonical at Begin.
- Register, death and earlier saves: "Do not impose mandatory Ironman or prohibit earlier-save loading" (so a one-save mode may exist only as an option).
- LQ-06: a child's household savings are generated from the parents' own history. Staff/notes: "Knowing people must pay off; the game keeps some notes for the player."
- Zero dice; behavior comes from each person; no fixed percentages.

## Existing code it must use

- `src/simulation/player-model.ts` — the adaptive model (header :1-27: it chooses what is offered, never outcomes).
- `src/simulation/situation-selection.ts:199 rankSituations`, `:235 selectSituation`; pacing constants `:183 PACING_PENALTY`, `:184 MONOTONY_PENALTY`, `:185 PACING_WINDOW`, stakes load `:189`; forbidden list in the header (:30-49). Callers: `src/presentation/adult-life.ts:217`, `formative-play.ts:183`, `life-story.ts:475/:521`.
- `src/presentation/new-game.ts:139 NewGameSetup` (setup inputs, Custom Start); `src/player/SetupScreen.tsx:323/:445` (Start a life / Custom start); `src/simulation/setup-priors.ts:65 setupPriorsOf` (setup answers kept on the World, never feeding generators).
- `src/player/ShellWorkspaces.tsx:1866 OptionsWorkspace` ("only settings something actually reads").
- Press: `src/simulation/press/outlets.ts:452 ensurePressMediaOpening`, `:711 hireReporter` (reporters generated as ordinary people), outlet plans `:59 OutletPlan`; `src/simulation/press/desk.ts:920 editorialDecision` (publish/hold/narrow/decline, uses corroboration), `:286 assignStory`.
- Money: `src/simulation/starting-money.ts:83 ensureStartingPersonalMoney` (positions from recorded work, never a zero); household from parents (Session 6 binds the Creator to `people-family.ts:191 recordFamilyAddition`).
- Saves: `src/player/SavesScreen.tsx`, `src/persistence/sqlite-world-repository.ts`.
- Notes surface: `src/presentation/person-dossier.ts` (what the player knows about a person); `src/simulation/favors.ts:391 favorsBetween`; `src/simulation/people-promise.ts`.

## What to change

1. **Where settings live.** Add `playSettings?: { challenge, notes, saves, premises }` to the World (types.ts `World`, :5764), written once at Begin from `NewGameSetup` and changed later only through one command `setPlaySetting(world, key, value)` that records a private event. Old saves read defaults (standard, full notes, free saves). Settings never reach `world.seed` or any generator stream after Begin.
2. **Challenge intensity (changeable any time).** `quiet | standard | relentless` maps to the pacing guard's weights (`PACING_PENALTY`, `MONOTONY_PENALTY`) in `rankSituations` via a lookup in `situation-selection.ts`. It reorders the SAME eligible candidates; it never adds a candidate, removes an independent world event, or touches resolution. Quiet may return null more often (a quiet week is real).
3. **Notes (changeable any time).** `full | light | none` controls what the notebook and dossier surface unprompted: full lists known stakes, promises due and favors owed with reminders; light shows them only when you open a person; none shows only what the character could recall in conversation. Every line still comes from the character's own knowledge records; nothing hidden is revealed at any setting.
4. **Saves (chosen at new game, fixed).** `free | one-save`: one-save keeps a single slot overwritten on every save and hides reload of earlier snapshots in `SavesScreen`. Default free.
5. **Family money premise (new game only).** `comfortable | ordinary | tight` becomes an input to the Creator's family generation (Session 6's forks): it steers which parents' jobs and recorded pay the existing writers produce, so savings and the home follow from their history through `ensureStartingPersonalMoney`. No direct cash grant, no money after Begin.
6. **Press premise (new game only).** `gentler | realistic | tougher` sets each outlet's recorded editorial standard at founding (how much corroboration `editorialDecision` requires before printing an allegation; add the field to the outlet record in `ensurePressMediaOpening`) and the temperament range reporters are generated from in `hireReporter` (persistence, conflict). From then on every story decision is the outlet's and reporter's own, as now; outlets founded later in play use the same premise.
7. **Screens.** Setup: one optional "Difficulty" step (skippable, defaults shown) on `SetupScreen`. In play: `OptionsWorkspace` gets Challenge and Notes; premises and saves are shown read-only with a plain sentence ("Chosen when this life began").

## Must NOT build

- Any multiplier on votes, election results, prices, pay, odds of being caught, NPC opinions or decisions.
- Rubber-banding toward a win rate, "easy mode" bailouts, or suppressing events that the world produced.
- Money or favors injected after Begin; changing premises mid-game.
- A second situation selector; dice; a visible difficulty score on screen.
- Mandatory Ironman.

## Done when (proof in a played game)

- Same seed and place, two new games: comfortable vs tight. The parents' recorded jobs and the starting balance differ and both trace to recorded pay; nothing else in the world differs at Begin except the household.
- Same seed, gentler vs tougher press: outlet records show different editorial standards; a scripted test allegation with one source is printed by the tougher outlet and held by the gentler one, each with recorded reasons.
- Same world, quiet vs relentless: `rankSituations` gets the identical candidate list; the selected order differs; replaying the same choices gives identical outcomes.
- Notes none vs full: the dossier shows fewer reminders, and no line at either setting cites knowledge the character lacks.
- Tests: `play-settings.test.ts`, `situation-selection.intensity.test.ts`, `press-premise.test.ts`, `family-money-premise.test.ts`, `saves-one-slot.test.ts`; existing `situation-selection` and `decisions` tests unchanged.

## Depends on

- Session 6 (Creator forks and the family writer) for the money premise; Session 4 (scene selection, `life-scene-flow.ts`, should rank through `selectSituation` so intensity applies to scenes too).
- Session 3 / 14 for the Options and Setup screen look.

## Open questions for the owner

- Should "more money" be a starting premise only (your family is better off; recommended, keeps the economy honest) or also an ongoing option (for example, campaigns cost less)? (a) Premise only; (b) also lower costs during play.
- Should the one-save mode exist at 1.0? (a) Yes, optional; (b) no, free saves only.
