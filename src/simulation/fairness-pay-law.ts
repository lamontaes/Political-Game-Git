import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import { drawnLinkSize } from "./outcome-web";
import { personGender } from "./person-identity";
import type { EntityId, IsoDate, World } from "./types";

/**
 * WHAT A FAIRNESS LAW DOES TO PAY. A state law, or a town's own ordinance,
 * that bars discrimination by sexual orientation in employment closes part of
 * the pay gap for men whose partner is a man: Burn (2018, Journal of Labor
 * Research) estimated a .027 log-hourly-wage gain (SE .012), with no established gain
 * for women in same-sex couples (Delhommer and Vamossy find the same pattern
 * for state and local laws).
 *
 * The game knows a man is in a same-sex couple only through a recorded,
 * active partnership with another man; that is how the study found them too
 * (couples in the Census). A man hired where neither his state's law nor his
 * town's ordinance covers him is paid his job's rate less the gap; where one
 * does, the full rate. The rate is set when he is hired, so a new law or a
 * repeal changes the pay of later hires, not of people already in the job.
 * Women, and anyone the record gives no gender, are paid the job's rate.
 *
 * The state question's "yes" means the law names both sexual orientation and
 * gender identity. A place whose starting law names sexual orientation only
 * (its row lists `grounds`) already covers these men, until a law enacted in
 * play answers the question.
 */

export const FAIRNESS_STATE_QUESTION =
  "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work";
export const FAIRNESS_CITY_QUESTION =
  "us-policy-positions:civil-family-community.city-nondiscrimination-ordinance";

/**
 * Burn (2018), Table 3: log hourly wage coefficient .027, clustered SE .012.
 * Normal 95% sampling interval = .027 +/- 1.96*.012. This is sampling
 * uncertainty, not measured state heterogeneity. The pre-2020 state-law
 * study does not establish post-Bostock or municipal incremental effects.
 * https://doi.org/10.1007/s12122-018-9272-0
 */
export const FAIRNESS_LOG_PAY_GAIN = {
  central: 0.027,
  low: 0.027 - 1.96 * 0.012,
  high: 0.027 + 1.96 * 0.012,
} as const;

/** One research-bounded wage coefficient for this world and state. */
export function uncoveredPayShareAt(
  world: World,
  jurisdictionId: EntityId,
): number {
  const key = lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  const stateId = key ? stateJurisdictionForKey(key)?.id : undefined;
  const logGain = drawnLinkSize(
    world,
    {
      key: "direct:fairness-law-log-hourly-pay",
      size: FAIRNESS_LOG_PAY_GAIN.central,
      range: [FAIRNESS_LOG_PAY_GAIN.low, FAIRNESS_LOG_PAY_GAIN.high],
      evidence: "researched",
    },
    stateId ?? jurisdictionId,
  );
  // A log-wage gain becomes a wage ratio through exp, not 1 + coefficient.
  return Math.exp(-logGain);
}

const SEXUAL_ORIENTATION = "sexual-orientation";

const STARTING_ROWS = (
  startingLaw.questions as unknown as Readonly<
    Record<
      string,
      {
        readonly answers: Readonly<
          Record<string, { readonly grounds?: readonly string[] }>
        >;
      }
    >
  >
)[FAIRNESS_STATE_QUESTION]?.answers;

function propositionId(world: World, stableKey: string): EntityId | null {
  const row = Object.values(world.policyCatalog?.propositions ?? {}).find(
    (entry) => entry.stableKey === stableKey,
  );
  return row?.id ?? null;
}

/** Everyone whose active partner on `date` shares their recorded gender "male". */
export function menPartneredWithMen(
  world: World,
  date: IsoDate,
  only?: EntityId,
): ReadonlySet<EntityId> {
  const partnerships = (world.history.partnerships ?? []).filter(
    (row) => only === undefined || row.personIds.includes(only),
  );
  const ids = new Set(partnerships.map((row) => row.id));
  const latest = new Map<
    EntityId,
    { at: IsoDate; seq: number; active: boolean }
  >();
  for (const state of world.history.partnershipStates ?? []) {
    if (state.effectiveAt > date || !ids.has(state.partnershipId)) continue;
    const seen = latest.get(state.partnershipId);
    if (
      !seen ||
      state.effectiveAt > seen.at ||
      (state.effectiveAt === seen.at && state.sequence > seen.seq)
    )
      latest.set(state.partnershipId, {
        at: state.effectiveAt,
        seq: state.sequence,
        active: state.status === "active",
      });
  }
  const men = new Set<EntityId>();
  for (const partnership of partnerships) {
    if (partnership.startedAt > date) continue;
    if (!latest.get(partnership.id)?.active) continue;
    const [a, b] = partnership.personIds;
    if (
      personGender(world.people[a]) === "male" &&
      personGender(world.people[b]) === "male"
    ) {
      men.add(a);
      men.add(b);
    }
  }
  return men;
}

/**
 * Whether a law in force where the job is covers a man partnered with a man:
 * the state's (or territory's) law, or the town's own ordinance.
 */
export function fairnessLawCovers(
  world: World,
  jobJurisdictionId: EntityId | null,
  date: IsoDate,
): boolean {
  if (!jobJurisdictionId) return false;
  const place = lifePlaceByJurisdictionId(jobJurisdictionId);
  const state = place?.stateJurisdictionKey
    ? stateJurisdictionForKey(place.stateJurisdictionKey)
    : null;
  const stateQuestion = propositionId(world, FAIRNESS_STATE_QUESTION);
  const law =
    state && stateQuestion
      ? lawInForce(world, state.id, stateQuestion, date)
      : null;
  if (law?.answer === "yes") return true;
  if (
    law?.origin === "in-force-at-start" &&
    place?.stateJurisdictionKey &&
    STARTING_ROWS?.[place.stateJurisdictionKey]?.grounds?.includes(
      SEXUAL_ORIENTATION,
    )
  )
    return true;
  const cityQuestion = propositionId(world, FAIRNESS_CITY_QUESTION);
  return (
    cityQuestion !== null &&
    jobJurisdictionId !== state?.id &&
    lawInForce(world, jobJurisdictionId, cityQuestion, date)?.answer === "yes"
  );
}

/**
 * What a person hired on `date` for work in `jobJurisdictionId` is paid, from
 * the job's pay `amountMinor`: the world's state wage share when he is a man
 * partnered with a man whom no fairness law covers there, never below
 * `floorMinor` (the minimum wage for the same hours); otherwise the job's
 * pay. One rule for every hire, the player's and the town's alike.
 */
export function payAtHire(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jobJurisdictionId: EntityId | null;
    readonly date: IsoDate;
    readonly amountMinor: number;
    readonly floorMinor: number;
  },
): {
  readonly amountMinor: number;
  readonly belowRate: boolean;
  readonly note: string;
} {
  const unchanged = {
    amountMinor: input.amountMinor,
    belowRate: false,
    note: "",
  };
  if (
    input.amountMinor <= 0 ||
    !input.jobJurisdictionId ||
    !lifePlaceByJurisdictionId(input.jobJurisdictionId) ||
    !menPartneredWithMen(world, input.date, input.personId).has(
      input.personId,
    ) ||
    fairnessLawCovers(world, input.jobJurisdictionId, input.date)
  )
    return unchanged;
  const amountMinor = Math.max(
    Math.round(
      input.amountMinor * uncoveredPayShareAt(world, input.jobJurisdictionId),
    ),
    Math.min(Math.round(input.floorMinor), input.amountMinor),
  );
  const belowRate = amountMinor < input.amountMinor;
  return {
    amountMinor,
    belowRate,
    note: belowRate
      ? `${((1 - amountMinor / input.amountMinor) * 100).toFixed(1)}% below the job's rate: no recorded state or town fairness protection covers him where he works`
      : "",
  };
}
