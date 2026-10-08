/**
 * The golden path, played headlessly through the functions the player's
 * buttons call.
 *
 * The owner's one path is: turn 18 → visit the clerk's office → file for the
 * council in a conversation that teaches campaigning → campaign → election →
 * seat → ordinance → the town changes → the next office. Part 1 drives a
 * seeded new game from the character's eighteenth birthday through the clerk,
 * the filing and the first campaign week, inside the seven simulated days the
 * testing rule allows until speed is fixed.
 *
 * Nothing here writes a World directly. Every step calls the same
 * presentation and simulation writers the shell calls (Begin, the clock
 * buttons, Places, the clerk's counter, the campaign week). A step that finds
 * the path broken records a break — what the player would hit, and the record
 * or code that shows it — and, where a later step can still be reached, takes
 * the nearest route the game offers so the rest of the path is still walked.
 *
 * Extend it by appending steps to `GOLDEN_PATH_STEPS` (election night, the
 * seat, the first ordinance) once a world can run that far.
 *
 *   node --import tsx scripts/golden-path/run.ts --seed golden-path-1
 */
import {
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { endQuestionnaireEarly } from "../../src/presentation/setup-questionnaire-flow";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../src/presentation/time-command";
import { projectCampaignOffices } from "../../src/presentation/campaign-office-discovery";
import { projectPlacesWorkspace } from "../../src/presentation/player-places";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordedDistrictForOffice,
} from "../../src/presentation/district-selection";
import { attendPartyWork } from "../../src/presentation/campaign-life-actions";
import {
  askClerk,
  fileAtClerk,
  leaveFilingVisit,
  projectClerkFilingScene,
} from "../../src/presentation/clerk-filing-scene";
import { filingOfficeForSeat } from "../../src/simulation/filing-office";
import {
  requestFilingVisit,
  scheduledFilingVisits,
} from "../../src/simulation/filing-visit";
import { scheduledActivityState } from "../../src/simulation/time-work";
import {
  activeCampaignForCandidate,
  localGoverningBodyIdentityForOfficeKey,
  personName,
  type EntityId,
  type World,
} from "../../src/simulation";
import { addDays, ageOnDate } from "../../src/simulation/dates";
import { municipalSeatChoices } from "../../src/simulation/municipal-seat-identity";
import {
  chooseCampaignWeekAction,
  projectCampaignWeekActions,
} from "../../src/simulation/campaign-week-actions";
import { campaignLifeActivityRecords } from "../../src/simulation/campaign-queries";
import {
  latestSupportState,
  quantityBasisPoints,
} from "../../src/simulation/campaign-support";
import { childAuthorityStateAt } from "../../src/simulation/life-queries";
import {
  deserializeWorld,
  serializeWorldPayload,
} from "../../src/simulation/serialization";
import type { LifePlace } from "../../src/simulation/life-places";
import { drawRandomPlace } from "../../tests/support/random-place";

/** What kind of break the player would hit. */
export type GoldenPathBreakKind =
  /** A writer or the clock threw. */
  | "crash"
  /** The player cannot go on along the path from here. */
  | "dead-end"
  /** A choice the path needs is not offered. */
  | "missing-choice"
  /** Something happened that should have changed a record and did not. */
  | "no-reaction"
  /** A value or outcome is wrong. */
  | "wrong"
  /** Text a player reads was written in code rather than from records. */
  | "hand-written-text"
  /** A day took longer than a player can wait. */
  | "slow";

export interface GoldenPathBreak {
  readonly step: string;
  readonly kind: GoldenPathBreakKind;
  readonly detail: string;
  /** Record IDs, file:line or measured values that show it. */
  readonly evidence: readonly string[];
}

export interface GoldenPathNote {
  readonly step: string;
  readonly date: string;
  readonly text: string;
}

export interface GoldenPathState {
  readonly seed: string;
  readonly place: LifePlace;
  readonly setup: NewGameSetup;
  readonly world: World;
  readonly playerPersonId: EntityId;
  /** The simulated date play began, so the seven-day budget can be checked. */
  readonly startDate: string;
  readonly filedOfficeKey: string | null;
  readonly breaks: readonly GoldenPathBreak[];
  readonly notes: readonly GoldenPathNote[];
  readonly dayTimingsMs: readonly {
    readonly date: string;
    readonly ms: number;
  }[];
}

export interface GoldenPathStep {
  readonly id: string;
  readonly title: string;
  readonly run: (state: GoldenPathState) => GoldenPathState;
}

/** The testing rule until "SPEED FIXED": at most seven simulated days. */
export const GOLDEN_PATH_DAY_BUDGET = 7;
/** A day the player waits longer than this for is a break, not a pause. */
export const GOLDEN_PATH_SLOW_DAY_MS = 60_000;

function brk(
  state: GoldenPathState,
  step: string,
  kind: GoldenPathBreakKind,
  detail: string,
  evidence: readonly string[] = [],
): GoldenPathState {
  return {
    ...state,
    breaks: [...state.breaks, { step, kind, detail, evidence }],
  };
}

function note(
  state: GoldenPathState,
  step: string,
  text: string,
): GoldenPathState {
  return {
    ...state,
    notes: [...state.notes, { step, date: state.world.currentDate, text }],
  };
}

function age(state: GoldenPathState): number {
  return ageOnDate(
    state.world.people[state.playerPersonId]!.birthDate,
    state.world.currentDate,
  );
}

function daysPlayed(state: GoldenPathState): number {
  return Math.round(
    (Date.parse(state.world.currentDate) - Date.parse(state.startDate)) /
      86_400_000,
  );
}

/** The player's "next day" button, timed. */
export function playOneDay(
  state: GoldenPathState,
  step: string,
): GoldenPathState {
  if (daysPlayed(state) >= GOLDEN_PATH_DAY_BUDGET)
    return note(state, step, "day budget reached; the clock was not moved");
  const before = state.world.currentDate;
  const started = Date.now();
  let result: ReturnType<typeof submitTimeCommand>;
  try {
    result = submitTimeCommand(state.world, {
      requestId: `golden-path:${state.seed}:${before}`,
      personId: state.playerPersonId,
      sourceMoment: state.world.currentMoment,
      command: { kind: "days", days: 1 },
    });
  } catch (error) {
    return brk(state, step, "crash", "The next-day button threw.", [
      String((error as Error)?.stack ?? error)
        .split("\n")
        .slice(0, 4)
        .join(" | "),
    ]);
  }
  const ms = Date.now() - started;
  let next: GoldenPathState = {
    ...state,
    world: result.world,
    dayTimingsMs: [...state.dayTimingsMs, { date: before, ms }],
  };
  if (
    result.receipt.status !== "accepted" ||
    result.world.currentDate === before
  )
    next = brk(
      next,
      step,
      "dead-end",
      "The next-day button did not move time.",
      [
        `status ${result.receipt.status}`,
        `outcome ${JSON.stringify(result.receipt.outcome)}`,
      ],
    );
  if (ms > GOLDEN_PATH_SLOW_DAY_MS)
    next = brk(next, step, "slow", `One day took ${Math.round(ms / 1000)} s.`, [
      `${before} → ${result.world.currentDate}`,
    ]);
  return next;
}

/**
 * New game, as the creator's Begin builds it: a random place among all 56,
 * a seventeen-year-old whose birthday the player sets two days after the
 * world's opening date.
 */
export function startGoldenPath(seed: string): GoldenPathState {
  const place = drawRandomPlace(seed);
  const opening = place.context.initialMoment.date;
  const birthday = addDays(opening, 2);
  const [, month, day] = birthday.split("-").map(Number);
  const setup = endQuestionnaireEarly({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startAge: 17,
    birthMonth: month!,
    birthDay: day!,
  });
  const game = generateOpeningLife(prepareOpeningLife(setup)).game!;
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  return {
    seed,
    place,
    setup,
    world,
    playerPersonId: game.playerPersonId,
    startDate: world.currentDate,
    filedOfficeKey: null,
    breaks: [],
    notes: [
      {
        step: "new-game",
        date: world.currentDate,
        text: `${personName(world.people[game.playerPersonId]!)}, ${place.displayName} (${place.stateJurisdictionKey}), place ${place.key}, seed ${seed}; born ${world.people[game.playerPersonId]!.birthDate}`,
      },
      { step: "new-game", date: world.currentDate, text: worldSize(world) },
    ],
    dayTimingsMs: [],
  };
}

/** The local governing body's seat, as the Campaigns list offers it. */
function councilOffice(state: GoldenPathState) {
  const offices = projectCampaignOffices(state.world, state.playerPersonId);
  return (
    offices.find(
      (office) =>
        localGoverningBodyIdentityForOfficeKey(office.officeKey)?.seat ===
        "governing-body",
    ) ?? null
  );
}

const turnEighteen: GoldenPathStep = {
  id: "turn-18",
  title: "Turn eighteen",
  run(start) {
    let state = start;
    const authoritiesBefore = state.world.history.childAuthorities.filter(
      (row) =>
        row.childPersonId === state.playerPersonId &&
        childAuthorityStateAt(state.world, row.id)?.status === "active",
    );
    const councilBefore = councilOffice(state);
    while (age(state) < 18 && daysPlayed(state) < GOLDEN_PATH_DAY_BUDGET) {
      const date = state.world.currentDate;
      state = playOneDay(state, "turn-18");
      if (state.world.currentDate === date) return state;
    }
    if (age(state) < 18)
      return brk(state, "turn-18", "dead-end", "The birthday never came.");
    state = note(state, "turn-18", `turned 18 on ${state.world.currentDate}`);
    const stillActive = authoritiesBefore.filter(
      (row) => childAuthorityStateAt(state.world, row.id)?.status === "active",
    );
    if (stillActive.length > 0)
      state = brk(
        state,
        "turn-18",
        "no-reaction",
        "Turning eighteen ended no parent's or guardian's authority.",
        stillActive.map((row) => `childAuthority ${row.id}`),
      );
    const councilAfter = councilOffice(state);
    state = note(
      state,
      "turn-18",
      `council seat ${councilAfter?.officeKey ?? "none"}: before ${councilBefore?.eligibility ?? "-"}; after ${councilAfter?.eligibility ?? "-"}`,
    );
    return state;
  },
};

const findTheClerk: GoldenPathStep = {
  id: "find-clerk",
  title: "Find the office where candidates file, and arrange a visit",
  run(state) {
    const places = projectPlacesWorkspace(state.world, state.playerPersonId);
    const offers = places?.offers ?? [];
    const council = councilOffice(state);
    const filing =
      offers.find(
        (offer) =>
          offer.filingSeatOfficeKey !== undefined &&
          council !== null &&
          filingOfficeForSeat(state.world, offer.filingSeatOfficeKey)?.unit
            .id ===
            filingOfficeForSeat(state.world, council.officeKey)?.unit.id,
      ) ?? offers.find((offer) => offer.filingSeatOfficeKey !== undefined);
    if (!filing)
      return brk(
        state,
        "find-clerk",
        "dead-end",
        "Places offers no clerk's or election office to go to.",
        [
          `Places offers: ${offers.map((offer) => `${offer.kind}:${offer.title}`).join(", ") || "none"}`,
        ],
      );
    const world = requestFilingVisit(
      state.world,
      state.playerPersonId,
      filing.filingSeatOfficeKey!,
    );
    const visit = scheduledFilingVisits(world, state.playerPersonId)[0];
    if (!visit)
      return brk(
        state,
        "find-clerk",
        "dead-end",
        `No visit to ${filing.title} could be arranged.`,
      );
    return note(
      { ...state, world },
      "find-clerk",
      `Places offered ${filing.title} (${filing.detail}); visit with ${personName(world.people[visit.participantPersonIds.find((id) => id !== state.playerPersonId)!]!)} at ${scheduledActivityState(world, visit.id).start.date} ${scheduledActivityState(world, visit.id).start.minuteOfDay}`,
    );
  },
};

/** Go to the counter and ask the clerk everything the seat asks. */
const clerkConversation: GoldenPathStep = {
  id: "clerk",
  title: "Talk with the clerk",
  run(start) {
    let state = start;
    const visit = scheduledFilingVisits(state.world, state.playerPersonId)[0];
    if (!visit) return state;
    let result: ReturnType<typeof submitTimeCommand>;
    try {
      result = submitTimeCommand(state.world, {
        requestId: `golden-path:${state.seed}:attend-clerk`,
        personId: state.playerPersonId,
        sourceMoment: state.world.currentMoment,
        command: { kind: "attend-activity", activityId: visit.id },
      });
    } catch (error) {
      return brk(state, "clerk", "crash", "Going to the clerk threw.", [
        (error as Error).message,
      ]);
    }
    state = { ...state, world: result.world };
    let scene = projectClerkFilingScene(state.world, state.playerPersonId);
    if (!scene)
      return brk(
        state,
        "clerk",
        "dead-end",
        "Attending the visit did not bring the player to the clerk's counter.",
        [
          `status ${result.receipt.status}`,
          `outcome ${JSON.stringify(result.receipt.outcome)}`,
          `now ${state.world.currentMoment.date} ${state.world.currentMoment.minuteOfDay}`,
        ],
      );
    for (const question of scene.questions) {
      const world = askClerk(
        state.world,
        state.playerPersonId,
        scene.activityId,
        question,
      );
      if (world === state.world)
        state = brk(
          state,
          "clerk",
          "no-reaction",
          `Asking the clerk "${question}" recorded nothing.`,
        );
      state = { ...state, world };
    }
    scene = projectClerkFilingScene(state.world, state.playerPersonId)!;
    const answers = scene.turns.flatMap((turn) =>
      turn.answer.map(
        (seat) =>
          `${turn.question}: ${seat.officeName}${
            seat.minimumAge?.kind === "known"
              ? ` age ${seat.minimumAge.value}`
              : ""
          }${seat.electionDate ? ` election ${seat.electionDate}` : ""}${
            seat.deadline ? ` deadline ${seat.deadline}` : ""
          }${
            seat.feeMinorUnits !== undefined
              ? ` fee ${seat.feeMinorUnits / 100}`
              : ""
          }${seat.filed ? ` filed ${seat.filed.length}` : ""}`,
      ),
    );
    return note(
      state,
      "clerk",
      `at the counter of ${scene.location.label} with ${scene.actors[0]!.name} (${scene.actors[0]!.role}); ${answers.join("; ")}`,
    );
  },
};

const fileForCouncil: GoldenPathStep = {
  id: "file",
  title: "File for the council",
  run(start) {
    let state = start;
    const council = councilOffice(state);
    const offices = projectCampaignOffices(state.world, state.playerPersonId);
    const target =
      council && council.eligible
        ? council
        : (offices.find((office) => office.eligible) ?? null);
    if (!council)
      state = brk(
        state,
        "file",
        "missing-choice",
        "The Campaigns list offers no seat on a local governing body.",
        offices.map((office) => `${office.officeKey}: ${office.eligibility}`),
      );
    else if (!council.eligible)
      state = brk(
        state,
        "file",
        "dead-end",
        `An eighteen-year-old cannot file for ${council.title}.`,
        [`${council.officeKey}: ${council.eligibility}`],
      );
    if (!target)
      return brk(state, "file", "dead-end", "No office is open to file for.");
    const scene = projectClerkFilingScene(state.world, state.playerPersonId);
    if (scene?.availableActions.includes(`file:${target.officeKey}`)) {
      const world = fileAtClerk(
        state.world,
        state.playerPersonId,
        scene.activityId,
        target.officeKey,
      );
      if (world === state.world)
        return brk(
          state,
          "file",
          "no-reaction",
          "Filing at the counter did nothing.",
        );
      state = { ...state, world, filedOfficeKey: target.officeKey };
    } else {
      state = brk(
        state,
        "file",
        "missing-choice",
        `The clerk's counter does not offer filing for ${target.title}; filing from the Campaigns screen instead.`,
        [
          scene
            ? `counter actions: ${scene.availableActions.join(", ")}`
            : "no counter",
        ],
      );
      const person = state.world.people[state.playerPersonId]!;
      const recorded = recordedDistrictForOffice(
        state.world,
        state.playerPersonId,
        target.officeKey,
      );
      const districts = offeredDistricts(
        state.world,
        person.homeJurisdictionId,
        target.officeKey,
      );
      const binding = recorded
        ? recorded.binding
        : districts.length
          ? bindingForDistrict(districts[0]!)
          : null;
      const seat =
        municipalSeatChoices(
          state.world,
          state.playerPersonId,
          target.officeKey,
        ).find((choice) => choice.eligible)?.key ?? null;
      try {
        const world = fileForOffice(
          state.world,
          state.playerPersonId,
          binding,
          target.officeKey,
          null,
          seat,
        );
        state = { ...state, world, filedOfficeKey: target.officeKey };
      } catch (error) {
        return brk(
          state,
          "file",
          "crash",
          `Filing for ${target.title} threw.`,
          [(error as Error).message],
        );
      }
    }
    const campaign = activeCampaignForCandidate(
      state.world,
      state.playerPersonId,
    );
    if (!campaign)
      return brk(state, "file", "no-reaction", "Filing wrote no campaign.");
    return note(
      state,
      "file",
      `filed for ${target.title} (${target.officeKey}); campaign ${campaign.id}, election ${
        state.world.history.electionContests?.find(
          (contest) => contest.id === campaign.contestId,
        )?.electionDate ?? "not on record"
      }`,
    );
  },
};

/** Leave the counter and go home by the same local route. */
const leaveTheClerk: GoldenPathStep = {
  id: "leave-clerk",
  title: "Go home from the clerk's office",
  run(state) {
    const scene = projectClerkFilingScene(state.world, state.playerPersonId);
    if (!scene) return state;
    const world = leaveFilingVisit(
      state.world,
      state.playerPersonId,
      scene.activityId,
    );
    if (world === state.world)
      return brk(
        state,
        "leave-clerk",
        "dead-end",
        "The player cannot leave the clerk's office for home.",
      );
    return note(
      { ...state, world },
      "leave-clerk",
      `home at ${world.currentMoment.date} ${world.currentMoment.minuteOfDay}`,
    );
  },
};

const firstCampaignWeek: GoldenPathStep = {
  id: "campaign-week",
  title: "The first campaign week",
  run(start) {
    let state = start;
    if (!state.filedOfficeKey) return state;
    const supportBefore = supportPercent(state);
    const metBefore = peopleMet(state);
    while (daysPlayed(state) < GOLDEN_PATH_DAY_BUDGET) {
      const week = projectCampaignWeekActions(
        state.world,
        state.playerPersonId,
      );
      const choice = week?.choices[0] ?? null;
      if (week && choice) {
        try {
          let world = chooseCampaignWeekAction(
            state.world,
            state.playerPersonId,
            {
              campaignId: week.campaignId,
              choiceId: choice.id,
              revision: week.revision,
            },
          );
          const activity = campaignLifeActivityRecords(world).at(-1)!;
          world = attendPartyWork(
            world,
            state.playerPersonId,
            activity.id,
            "attended",
          );
          state = note(
            { ...state, world },
            "campaign-week",
            `did ${choice.form}`,
          );
        } catch (error) {
          state = brk(state, "campaign-week", "crash", "A week choice threw.", [
            (error as Error).message,
          ]);
        }
      } else {
        if (
          week &&
          state.notes.every((n) => !n.text.startsWith("week actions"))
        )
          state = note(
            state,
            "campaign-week",
            `week actions unavailable: ${week.availabilityReason}`,
          );
        const offered = projectCampaign(state.world, state.playerPersonId);
        const before = state.world;
        try {
          const world = spendAnAfternoon(
            state.world,
            state.playerPersonId,
            "outreach",
          );
          state =
            world === before
              ? note(
                  state,
                  "campaign-week",
                  "an afternoon of outreach was refused",
                )
              : note(
                  { ...state, world },
                  "campaign-week",
                  "spent an afternoon on outreach",
                );
        } catch (error) {
          state = brk(state, "campaign-week", "crash", "Outreach threw.", [
            (error as Error).message,
            `offers ${JSON.stringify(offered?.actions ?? null).slice(0, 300)}`,
          ]);
        }
      }
      const date = state.world.currentDate;
      state = playOneDay(state, "campaign-week");
      if (state.world.currentDate === date) break;
    }
    const supportAfter = supportPercent(state);
    const met = peopleMet(state).filter((id) => !metBefore.includes(id));
    state = note(
      state,
      "campaign-week",
      `support ${supportBefore ?? "-"}% → ${supportAfter ?? "-"}%; ${met.length} people met this week${
        met.length
          ? `: ${met
              .slice(0, 5)
              .map((id) => personName(state.world.people[id]!))
              .join(", ")}`
          : ""
      }`,
    );
    if (supportAfter === supportBefore)
      state = brk(
        state,
        "campaign-week",
        "no-reaction",
        "A week of campaigning did not move the candidate's support.",
        [`support ${supportBefore ?? "-"}%`],
      );
    if (met.length === 0)
      state = brk(
        state,
        "campaign-week",
        "no-reaction",
        "A week of campaigning met nobody by name.",
      );
    return state;
  },
};

/** The candidate's recorded support in their own race, in percent. */
function supportPercent(state: GoldenPathState): number | null {
  const campaign = activeCampaignForCandidate(
    state.world,
    state.playerPersonId,
  );
  const scope = campaign?.candidateSupportScopes.find(
    (entry) => entry.candidatePersonId === state.playerPersonId,
  );
  if (!campaign || !scope) return null;
  return (
    quantityBasisPoints(latestSupportState(state.world, campaign, scope)) / 100
  );
}

/** Everybody the player has a recorded interaction with. */
function peopleMet(state: GoldenPathState): readonly EntityId[] {
  return [
    ...new Set(
      state.world.history.relationshipInteractions.flatMap((row) =>
        row.personIds.includes(state.playerPersonId)
          ? row.personIds.filter((id) => id !== state.playerPersonId)
          : [],
      ),
    ),
  ];
}

/** Save and reload through the save path the shell uses, as Continue does. */
const saveAndContinue: GoldenPathStep = {
  id: "save-continue",
  title: "Save and continue",
  run(state) {
    let started = Date.now();
    let saved: ReturnType<typeof serializeWorldPayload>;
    try {
      saved = serializeWorldPayload(state.world);
    } catch (error) {
      return brk(state, "save-continue", "crash", "Saving threw.", [
        (error as Error).message,
      ]);
    }
    const saveMs = Date.now() - started;
    const size = (typeof saved === "string" ? [saved] : saved).reduce(
      (total, chunk) => total + chunk.length,
      0,
    );
    let next = note(
      state,
      "save-continue",
      `saved ${Math.round(size / 1_000_000)} MB of JSON in ${Math.round(saveMs / 1000)} s; ${worldSize(state.world)}`,
    );
    started = Date.now();
    try {
      const reloaded = deserializeWorld(saved);
      next = note(
        { ...next, world: reloaded },
        "save-continue",
        `reloaded in ${Math.round((Date.now() - started) / 1000)} s`,
      );
    } catch (error) {
      return brk(next, "save-continue", "crash", "Continue threw.", [
        (error as Error).message,
      ]);
    }
    if (saveMs > GOLDEN_PATH_SLOW_DAY_MS)
      next = brk(
        next,
        "save-continue",
        "slow",
        `Saving took ${Math.round(saveMs / 1000)} s.`,
      );
    return next;
  },
};

/** The largest history lists, so a later run can see what grows. */
export function worldSize(world: World): string {
  const lists = Object.entries(world.history)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => [key, (value as unknown[]).length] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  return `people ${Object.keys(world.people).length}; ${lists
    .map(([key, length]) => `${key} ${length}`)
    .join(", ")}`;
}

/** Part 1 of the golden path. Later parts append after the campaign week. */
export const GOLDEN_PATH_STEPS: readonly GoldenPathStep[] = [
  turnEighteen,
  findTheClerk,
  clerkConversation,
  fileForCouncil,
  leaveTheClerk,
  firstCampaignWeek,
  saveAndContinue,
];

export function playGoldenPath(
  seed: string,
  steps: readonly GoldenPathStep[] = GOLDEN_PATH_STEPS,
  onStep?: (step: GoldenPathStep, state: GoldenPathState) => void,
): GoldenPathState {
  let state = startGoldenPath(seed);
  for (const step of steps) {
    try {
      state = step.run(state);
    } catch (error) {
      state = brk(state, step.id, "crash", `${step.title} threw.`, [
        String((error as Error)?.stack ?? error)
          .split("\n")
          .slice(0, 4)
          .join(" | "),
      ]);
    }
    onStep?.(step, state);
  }
  return state;
}
