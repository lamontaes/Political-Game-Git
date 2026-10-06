/**
 * Migration and society-wide waves: the contract.
 *
 * Two layers, built in this order because the owner said the first informs
 * the second (2026-09-22):
 *
 * 1. MOVEMENT. People and whole households leave one place for another, for a
 *    recorded reason, over ordinary time. New people arrive in the player's
 *    town. Every move is one dated `migration.moved` event plus the residence
 *    records it changes; nothing is inferred later.
 * 2. WAVES. A large movement (a flight from the cities, a religious revival)
 *    begins from recorded causes, has a scope and an intensity, and acts on
 *    the world through the same movement layer and, later, through beliefs,
 *    parties and the press.
 *
 * This file names every place the two layers connect to something else, and
 * says for each whether it is built. An unbuilt connection is not silent: it
 * has a BLANKET RULE that holds until someone builds it, and the rule is what
 * the code actually does today. `MIGRATION_SEAMS` is the list a future lane
 * reads to find where to plug in.
 *
 * Every number marked BLANKET is a placeholder chosen to make the mechanism
 * visible, not a researched value. The historical pace and scale are filed as
 * research questions `migration-rates-and-reasons` and
 * `society-wide-waves-causes-pace-scale`; when those are answered the numbers
 * move to data and the marker goes.
 */

import type { EntityId, IsoDate } from "../types";

export const MIGRATION_CONTRACT_VERSION = "migration-scaffold/v1";

/** One event per move, whoever and however many moved. */
export const MIGRATION_MOVED_EVENT = "migration.moved";
/** Somebody new came to live in the player's town. */
export const MIGRATION_ARRIVED_EVENT = "migration.arrived";
/** A wave was recorded as beginning in a scope. */
export const WAVE_BEGAN_EVENT = "migration.wave-began";
/** A wave was recorded as over in a scope. */
export const WAVE_ENDED_EVENT = "migration.wave-ended";

export const MIGRATION_REVIEW_TRANSITION_KEY = "migration:quarterly-review";

/**
 * Why somebody moved. Open taxonomy, namespaced like the rest of the life
 * records: a mod or a later lane adds `work:transfer` without touching this.
 *
 * - `life-course:` the ordinary reasons nobody records a cause for.
 * - `work:` a job, a transfer, a lost job. `work:job-lost` is produced.
 * - `family:` joining or following family. `family:followed-kin` is produced.
 * - `cost:` housing or living costs. `cost:evicted` and `cost:rent-burden`
 *   are produced.
 * - `wave:` a wave's pressure; the suffix is the wave key.
 * - `disaster:` a disaster destroyed or damaged the home.
 * - `custom:` anything else, named.
 */
export type MoveReasonNamespace =
  "life-course" | "work" | "family" | "cost" | "wave" | "disaster" | "custom";
export type MoveReasonKey = `${MoveReasonNamespace}:${string}`;

export const MOVE_REASON_NAMESPACES: readonly MoveReasonNamespace[] = [
  "life-course",
  "work",
  "family",
  "cost",
  "wave",
  "disaster",
  "custom",
];

export type SeamStatus = "built" | "not-built";

/** One place this system meets another. */
export interface MigrationSeam {
  readonly key: string;
  /** What connects to what, in a sentence. */
  readonly connects: string;
  readonly status: SeamStatus;
  /** What the code does today. For a built seam, what it does; for an unbuilt one, the rule that holds meanwhile. */
  readonly rule: string;
  /** Where the code sits, or where it would go. */
  readonly where: string;
}

/**
 * Every hookup, built or not. Order: movement, then waves.
 *
 * Kept as data so a test can assert each unbuilt seam still has a rule, and
 * so the system document is checked against the code rather than drifting.
 */
export const MIGRATION_SEAMS: readonly MigrationSeam[] = [
  {
    key: "residence-records",
    connects:
      "A move changes the person's home, their current residence fact and their household's location.",
    status: "built",
    rule: "The old residence fact is closed on the move date and a new one opened; the household gets a superseding location; homeJurisdictionId follows. One integrity check per quarterly review, not per move.",
    where: "src/simulation/migration/relocate.ts",
  },
  {
    key: "who-may-move",
    connects:
      "Jobs, schooling, housing tenure, organization and party membership, dwellings and office tie a person to a place.",
    status: "not-built",
    rule: "Anybody with such a record active today is not eligible to move, and neither is their household; a job, school, membership, lease or campaign that has ended holds nobody. Moving would leave a job or a seat in the old town, so the move is refused with that reason rather than half-done. A town job, a town home and an ordinary membership (a member or participant, not a leader or an advisor) end on the move instead of holding anyone. Other housing is ended on the move only for a household a disaster displaced.",
    where: "src/simulation/migration/relocate.ts moveTieReader()",
  },
  {
    key: "disaster-displacement",
    connects:
      "A household whose home a disaster destroyed or damaged leaving town for good.",
    status: "built",
    rule: "At the next quarterly review, a household whose home a disaster destroyed or damaged weighs the wreck (recorded game-profile strengths, HOME_LOST_STRENGTH) with its other recorded causes against the same bar as anyone leaving: their age's mover rate in their state, a home they own, children at home and their taste for risk, in one evaluateDecision with no randomness. One that leaves goes where its cause or its closest relative elsewhere lives, reason disaster:home-destroyed or disaster:home-damaged when the wreck weighs most, and its dwelling occupancy and housing tenure end on the move. A household held by a job, school, membership or campaign stays, because ending those is not built.",
    where:
      "src/simulation/migration/causes.ts homeLostCause(), review.ts reviewTown()",
  },
  {
    key: "displacement-and-return",
    connects:
      "Households leaving a wrecked home for a while, living elsewhere, and coming back.",
    status: "not-built",
    rule: "A displaced household either leaves town for good or stays in the damaged home while it is repaired. Nobody is recorded as living elsewhere for a while.",
    where: "src/simulation/migration/review.ts",
  },
  {
    key: "player-household",
    connects: "The player and the people they live with.",
    status: "not-built",
    rule: "Never moved by the simulation. The player's own move is a player choice with no route yet.",
    where: "src/simulation/migration/relocate.ts",
  },
  {
    key: "leaving-a-shared-household",
    connects: "One member leaving a household the others stay in.",
    status: "not-built",
    rule: "A household moves whole or not at all.",
    where: "src/simulation/migration/relocate.ts",
  },
  {
    key: "district-membership",
    connects:
      "State legislative district membership derived from the home place.",
    status: "built",
    rule: "An open membership joined from the old home is closed on the move date. Joining the new home's district is not built: a mover's new district is unknown, which is what the district reader already says for a home it cannot join.",
    where: "src/simulation/migration/relocate.ts",
  },
  {
    key: "why-people-leave",
    connects:
      "Economy, family, housing cost, age and life stage as reasons to move.",
    status: "built",
    rule: "Each adult in a town is reviewed once a year, and leaves only when a recorded cause pushes them past their own bar: an offer of work from a recorded employer elsewhere still waiting for their answer (job-offers.ts: whether they look comes from their own work, pay, age, field and taste for risk), a job lost or a retirement in the last year, an eviction, the household's rent against its pay, a relative's move away, or a household of their own formed in the last year (they left a parent's home by their own decision, living-world/leaving-home.ts, moved in with a partner, or moved out after a breakup). The bar is how rarely people their age in their state move (American Community Survey 2024, data/research/migration/mover-rates-acs-2024.json), a home they own, children at home and their taste for risk; the town's waves, state push, crime and jobs weigh on either side. One evaluateDecision with no randomness decides it. School elsewhere has no producer yet, so it is never read.",
    where: "src/simulation/migration/causes.ts decideToLeave()",
  },
  {
    key: "where-people-go",
    connects: "Choosing a destination from distance, jobs, family and cost.",
    status: "not-built",
    rule: "A resident goes to the place their cause names: the place of the offer they take, which they accept and start on arrival, or where the relative they follow now lives. A push from a lost job, rent, eviction or retirement names no place, so they go where their closest living relative outside town lives, and with nobody there, to the rest of their own state (HARDWIRED until a home found elsewhere is recorded). A household a disaster displaced goes the same way. Nothing is drawn. A newcomer comes from the town's own state's largest other town (HARDWIRED, placeToLookFor), where a resident looking for work elsewhere looks first.",
    where: "src/simulation/migration/review.ts reviewTown(), arrivalInputs()",
  },
  {
    key: "arrivals",
    connects: "New residents of the player's town.",
    status: "built",
    rule: "A newcomer comes for a job in town that nobody in town is there to take: a job whose worker moved away, died or retired in the last two years (the recorded eight quarterly reviews, OPENING_REVIEWS_HELD), less as many of the newest as the town has residents out of work and looking. Each opening pulls from 1 when the rent of a one-person home takes no more than 30 percent of its pay (HUD's cost-burden line), sliding to nothing at 80 percent, over the town's push; it is taken once the reviews it has stood open times its pull reach one, so a job whose pay covers the rent is taken at once and one the rent swallows never is. No draw. The survey's newcomers per resident for the place's state (mover-rates-acs-2024.json) check the total and decide no arrival. Each arrival is one adult with a name, an identity and the place they came from, tagged with the opening they came for.",
    where: "src/simulation/migration/review.ts townOpenings(), arrivalInputs()",
  },
  {
    key: "arrival-history",
    connects:
      "A newcomer's life before arriving: schooling, work, family, politics.",
    status: "not-built",
    rule: "An arrival carries a birth date, a name, an identity and the state they came from, nothing more. The owner's rule that history is generated up to a person's age applies and is not met yet.",
    where: "src/simulation/migration/review.ts arrivalInputs()",
  },
  {
    key: "arriving-families",
    connects: "Households arriving together, with children.",
    status: "not-built",
    rule: "Arrivals are single adults, each living alone in a one-person household located in town, with no dwelling record. The household is what lets a disaster in town reach them.",
    where: "src/simulation/migration/review.ts",
  },
  {
    key: "beliefs-carried",
    connects:
      "Movers bringing their politics; places changing because of who lives there.",
    status: "not-built",
    rule: "A move changes no belief and no affiliation. Newcomers get none, which is the existing unaffiliated-people gap, unchanged by this system.",
    where: "src/simulation/political-belief-formation.ts",
  },
  {
    key: "press",
    connects: "Moves and waves reaching the newspapers.",
    status: "built",
    rule: "Wave beginnings and endings are public events the weekly desk sweep can pick up. Ordinary moves are limited-visibility life events and do not reach the desk.",
    where: "src/simulation/migration/waves.ts",
  },
  {
    key: "wave-causes",
    connects:
      "Real causes starting a wave: court orders, highways, plant closings, disasters, revival preachers, a war.",
    status: "not-built",
    rule: "Only two causes are evaluated: a scenario date, and unemployment in the macro record at or above a level. Every other cause kind is kept on the definition and reads as not met, with its reason in the result.",
    where: "src/simulation/migration/waves.ts evaluateCause()",
  },
  {
    key: "wave-spread",
    connects: "A wave spreading from place to place and person to person.",
    status: "not-built",
    rule: "BLANKET: a wave has one scope for its whole life and a fixed intensity from its definition. It ends after its authored duration.",
    where: "src/simulation/migration/waves.ts",
  },
  {
    key: "wave-who-moves",
    connects:
      "Which people a wave moves: by income, faith, group, age, household.",
    status: "not-built",
    rule: "A wave's migration effect scales the flat departure or arrival chance for everyone in its scope alike. It selects nobody by group, which is the part that made historical white flight what it was; that needs research before it is modeled.",
    where: "src/simulation/migration/review.ts",
  },
  {
    key: "wave-beliefs",
    connects: "A wave changing what people believe: a revival, a movement.",
    status: "not-built",
    rule: "A belief effect is recorded on the definition and applied to nobody. ChatGPT's standing answer forbids overwriting a person's views directly, so this waits on the belief-formation layer having a caller outside the demo.",
    where: "src/simulation/migration/waves.ts",
  },
  {
    key: "wave-parties",
    connects: "A wave feeding party evolution: new factions, realignment.",
    status: "not-built",
    rule: "Party evolution reads nothing from waves.",
    where: "src/simulation/living-world/party-evolution.ts",
  },
  {
    key: "wave-content",
    connects: "Modders adding their own waves.",
    status: "not-built",
    rule: "The catalog is a list in source validated like data. Loading a wave from a runtime content pack is not built.",
    where: "src/simulation/migration/waves.ts WAVE_CATALOG",
  },
  {
    key: "old-saves",
    connects: "Saves made before this system existed.",
    status: "not-built",
    rule: "Migration is scheduled only for lives opened at the current world opening version. An older save sees no moves, arrivals or waves.",
    where: "src/presentation/opening-life.ts",
  },
];

/** What a quarterly review decided, for tests and for a future debugging surface. */
export interface MigrationReviewSummary {
  readonly reviewedOn: IsoDate;
  readonly departedHouseholds: number;
  readonly departedPeople: number;
  readonly arrivals: number;
  readonly refused: readonly {
    readonly personId: EntityId;
    readonly reason: string;
  }[];
}
