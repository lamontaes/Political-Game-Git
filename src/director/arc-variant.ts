/**
 * Which arc a scene plays (owner, Nov 8, 9:50 voice note: "they've gotta have
 * like a variance. So even though there's only 5 in corruption scenes right
 * now, you could get, I'm just making a number up, 30 different scenes within
 * there"). One kind of scene may have several arcs, its variants: the same
 * purpose played as a small gift, a large sum, a friend's favor, a second ask,
 * a desperate plea. Which one a scene plays is read from the records, the way
 * an address's kind is (address-kind.ts): each variant's score is what the
 * records give it, a sum of named reads each between 0 and 1 with its weight,
 * times one plus the asker's pull toward it (the mean of the personality facets
 * the variant lists). The highest score wins and a tie goes to the name first
 * in the alphabet. No roll picks it, and nothing flips at a threshold: a
 * bribe a little smaller than another is a little more of a gift.
 *
 * This is the one engine for every kind. A kind with no row in
 * `data/arc-variants.json` plays its purpose's single arc as before. The
 * variant's arc (state, replies, follow, again, endings) is a row of the same
 * data; the words are the scene bank's, by the variant's own purpose id, and
 * the family's pieces serve where a variant has none of its own
 * (`SceneMove.family`). It holds no sentence and no kind's name: what a read
 * looks at is data, and the reads are fifteen ways of looking.
 *
 * The reads use only what stays true while the scene is open (the record the
 * cause names, the tie as that record kept it, what happened before the
 * cause's day), so the tree the player sees is the tree their reply is
 * matched against.
 */
import { P, parameter } from "../core2/parameters";
import { closenessBetween } from "../core2/closeness";
import { daysBetweenText } from "../core2/kernel/dates";
import { outletsHere } from "../core2/modules/press";
import { careNeedOf } from "../core2/modules/health";
import { votesOf } from "../core2/modules/people";
import {
  LEADERSHIP_MODULE_ID,
  LEGISLATURE_MODULE_ID,
  billOf,
  favorReturnedSince,
  provisionStance,
  votesOn,
} from "../core2/modules/legislature";
import { partyTie } from "../core2/modules/elections";
import { electorateSides, scandalStoriesOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { directorStopgap, WORDS_STOPGAP_HITS } from "./stopgaps";
import variantFile from "./data/arc-variants.json" with { type: "json" };

interface Tagged {
  value: number;
}

/** One way of looking at the records, by its kind. */
type ReadSpec = ReadKind & {
  /** The read counts only where the cause record's fact holds this value (a wage case's shortfall means nothing on a job seeker's case); else 0. */
  when?: { fact: string; is: string };
};

type ReadKind =
  | {
      /** A number kept on a module's record, named by a fact of the cause record. */
      kind: "record";
      module: string;
      table: string;
      /** The cause record's fact that names the row. */
      idFact: string;
      /** The field, as a path through the row. */
      field: string;
      /** A share of the asked person's year of living costs, or their household's if larger: field / (field + their year). */
      against?: "asked-year";
      /** A share of this much: field / (field + scale). Without either, the field itself between 0 and 1. */
      scale?: Tagged;
      /** 1 where the field holds exactly this value (a complaint's basis, a taken bribe), else 0: a fact about the row, not a number on it. */
      equals?: string | boolean;
    }
  | {
      /** How many earlier records of these kinds name both people, as count / (count + scale). */
      kind: "history";
      events: readonly string[];
      /** A record sharing this fact's value with the cause is the same matter, not an earlier one. */
      exceptSameFact: string;
      /** Only records whose facts hold all of these values count (a scene reply that ended a donor's ask). */
      where?: Readonly<Record<string, string>>;
      /** `asked`: a record that names only the asked person counts (a story printed about them); the default needs both people named. */
      named?: "both" | "asked";
      /** Only records this many days old or newer count: a story from last month is open, one from years ago is not. */
      within?: Tagged;
      scale: Tagged;
    }
  | {
      /**
       * How many stories of scandal stand against the asked person (a bribe
       * reported to the press, a conviction made public: the same stories
       * voters weigh), as count / (count + scale).
       */
      kind: "scandal";
      scale: Tagged;
    }
  | {
      /**
       * How far the town stands against the side the asked person took on the
       * cause's bill, from their vote on the record and where the electorate
       * stands on its question (the same shares a platform is weighed by): the
       * share on the other side less the share on theirs, never below nothing.
       */
      kind: "town-against";
    }
  | {
      /** 1 where the tie's last contact between the two was a quarrel (the tie's own record), else 0. */
      kind: "quarrel";
    }
  | {
      /** 1 where the asker writes for a national outlet (the press engine's outlet row), else 0. */
      kind: "national-outlet";
    }
  | {
      /** A number between 0 and 1 for the value a fact of the cause record holds (the level of a bill, by how far it reaches). */
      kind: "fact-map";
      fact: string;
      values: Readonly<Record<string, number>>;
    }
  | {
      /**
       * A number the cause record itself carries as a fact (a gift's amount, its
       * share of what others gave). With `against`, a share of that person's
       * year of living costs, the half point at `of` times the year; with
       * `scale`, a share of this much; with neither, the fact itself between 0
       * and 1.
       */
      kind: "fact";
      fact: string;
      against?: "asker-year" | "asked-year";
      of?: Tagged;
      scale?: Tagged;
    }
  | {
      /** How close the two people are now, from their tie's record (closeness.ts), between 0 and 1. */
      kind: "closeness";
    }
  | {
      /**
       * How hard pressed the asker is for money: a year of their living costs
       * against that year plus the cash they hold (the corruption engine's own
       * shape for an official's money pressure), 1 with nothing put by.
       */
      kind: "strain";
    }
  | {
      /**
       * 1 where the asker and the asked belong to the same party (the parties
       * engine's tie of each), else 0.
       */
      kind: "shared-party";
    }
  | {
      /**
       * 1 where the asker holds a post in a body's leadership (speaker, a
       * party's leader or whip: the leadership engine's post rows), else 0.
       */
      kind: "holds-post";
    }
  | {
      /**
       * How many earlier bills of the asked person's own the asker voted for
       * (the vote records of the asker, the bill's sponsor), as count /
       * (count + scale): a vote already given the asked person's way.
       */
      kind: "favor-given";
      scale: Tagged;
    }
  | {
      /**
       * How far the town stands for (or against) the cause's bill, from the
       * questions its sections change and where the electorate stands on each
       * (the same shares a platform is weighed by): the mean of the share on
       * the side the bill takes less the share on the other, never below nothing.
       */
      kind: "town-on-bill";
      side: "for" | "against";
    }
  | {
      /**
       * How many rows of a module's table kept for the asker (a layoff in the
       * jobs module's changes) fall in the last `within` days before the
       * cause's day, as count / (count + scale). Rows from the cause's day on
       * are not earlier and do not count.
       */
      kind: "person-rows";
      module: string;
      table: string;
      /** The table's index on the person id. */
      index: string;
      /** Only rows whose fields hold all of these values count. */
      where?: Readonly<Record<string, string>>;
      within: Tagged;
      scale: Tagged;
    }
  | {
      /**
       * An open row of a module's table kept for the asker's household (a
       * rent notice served on it): 1 where one stands, else 0. With `field`,
       * the number the newest open row holds, as a share of the asker's year
       * of living costs (`against`) or of `scale`.
       */
      kind: "household-case";
      module: string;
      table: string;
      /** The table's index on the household id. */
      index: string;
      field?: string;
      against?: "asker-year";
      scale?: Tagged;
    }
  | {
      /**
       * How much care a person's health asks of them and the people close to
       * them (the health engine's own sliding scale, 0 up toward 1): the
       * asker's own, or the most any other member of their household needs.
       */
      kind: "care-need";
      whose: "self" | "household";
    }
  | {
      /** 1 where the scene is set at this kind of place, else 0. */
      kind: "setting";
      is: string;
    };

interface Term {
  read: string;
  weight: number;
  /** Use one minus the read: a small bribe is a bribe that is not large. */
  low?: boolean;
}

interface VariantRow {
  /** The purpose id the scene plays: the family's own for the plain variant. */
  purpose: string;
  base: number;
  terms?: readonly Term[];
  pull?: readonly string[];
  /**
   * The cause this variant speaks to: where the cause's record carries this
   * fact, the variant plays only for this value (a visitor whose case is about
   * work never states a relative's illness instead). A cause without the fact
   * leaves every variant open.
   */
  forCause?: { fact: string; is: string };
  /**
   * The only cause this variant plays for: the cause's record must carry this
   * fact with this value (a door's variants play at a door, where the knock's
   * record says whether a petition circulates, never when someone else asks
   * the player for the same thing).
   */
  onlyFor?: { fact: string; is: string };
  /** The variant's arc; absent for the family's own purpose, whose arc is in purpose-arcs.json. */
  arc?: unknown;
}

interface VariantData {
  reads: Readonly<Record<string, ReadSpec>>;
  families: Readonly<
    Record<string, { variants: Readonly<Record<string, VariantRow>> }>
  >;
}

const DATA = variantFile as unknown as VariantData;

/** Every variant's arc by its purpose id. */
const ARCS = new Map<string, unknown>(
  Object.values(DATA.families).flatMap((family) =>
    Object.values(family.variants).flatMap((row) =>
      row.arc ? [[row.purpose, row.arc] as const] : [],
    ),
  ),
);

/** Each variant purpose to the family purpose it is a variant of (the family's pieces serve it too). */
export function variantFamilies(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(DATA.families).flatMap(([family, row]) =>
      Object.values(row.variants).map((variant) => [variant.purpose, family]),
    ),
  );
}

/** The arc a variant purpose plays, or undefined for a purpose that is not a variant. */
export function variantArc(purpose: string): unknown {
  return ARCS.get(purpose);
}

/**
 * The earlier bills of the asked person's own that the asker voted for, newest
 * first: the vote already given the asked person's way, with the bill it was
 * on. Bills before the cause's day, other than the cause's own bill.
 */
export function favorsGiven(
  core: Readonly<CoreState>,
  askerId: PersonId,
  askedId: PersonId,
  before: string,
  exceptBillId?: string,
): readonly { readonly voteId: string; readonly billId: string }[] {
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return [];
  const api = coreAPI(core as CoreState);
  // A favor is a yes the asker cast. The record's stance is the vote's side
  // times the bill's own direction, so a no on a bill that repeals or cuts
  // reads positive there: the roll call's own vote decides where it holds
  // one, and the record's side only where it does not.
  const castYes = (billId: string, position: number) => {
    const cast = votesOn(api, billId).find(
      (vote) =>
        vote.memberId === askerId &&
        !(vote as { override?: boolean }).override,
    );
    return cast ? cast.vote === "yes" : position > P.zero;
  };
  const seen = new Set<string>();
  return votesOf(api, askerId)
    .filter((row) => {
      if (
        row.date >= before ||
        row.billId === exceptBillId ||
        seen.has(row.billId) ||
        (billOf(api, row.billId) as { sponsorId?: string } | undefined)
          ?.sponsorId !== askedId ||
        !castYes(row.billId, row.stance.position) ||
        // Once the asked person gave a yes back, the two are square.
        favorReturnedSince(api, askedId, askerId, row.date)
      )
        return false;
      // A bill with several questions has a record row for each: one favor.
      seen.add(row.billId);
      return true;
    })
    .reverse()
    .map((row) => ({ voteId: row.id, billId: row.billId }));
}

/** What the scene is, as the choice reads it. */
export interface VariantInput {
  /** The type's own purpose: the family. */
  readonly family: string;
  readonly askerId: PersonId;
  readonly askedId: PersonId;
  /** The record that fired the scene. */
  readonly cause: {
    readonly id: string;
    readonly date: string;
    readonly facts: Readonly<Record<string, string>>;
  };
  /** The kind of place it is set at (the binding's setting). */
  readonly setting?: string;
  /**
   * A return visit (a second knock on the same door): the variant with the
   * next highest score plays where it scores above nothing and no less than
   * the family's plain arc, so a resident with two records raises the other
   * one the second time.
   */
  readonly nextDown?: boolean;
}

export interface VariantScore {
  readonly variant: string;
  readonly purpose: string;
  readonly score: number;
}

export interface VariantChoice {
  /** The variant's name within its family. */
  readonly variant: string;
  /** The purpose id the scene plays. */
  readonly purpose: string;
  readonly family: string;
  /** Every variant's score, highest first. */
  readonly scores: readonly VariantScore[];
  /** Every read that mattered, between 0 and 1. */
  readonly reads: Readonly<Record<string, number>>;
  /** The records the reads came from. */
  readonly recordIds: readonly string[];
}

const clamp = (value: number) => Math.max(P.zero, Math.min(P.one, value));

/** A field of a row, by path ("reasons.offer.stake"); undefined when it is not a number. */
function fieldOf(row: unknown, path: string): number | undefined {
  let at: unknown = row;
  for (const step of path.split(".")) {
    if (typeof at !== "object" || at === null) return undefined;
    at = (at as Record<string, unknown>)[step];
  }
  return typeof at === "number" && Number.isFinite(at) ? at : undefined;
}

/** The mean of the asker's values on the facets a variant lists, between -1 and 1. */
function pullOf(
  core: Readonly<CoreState>,
  askerId: PersonId,
  facets: readonly string[],
): number {
  const traits = core.people.get(askerId)?.traits ?? {};
  if (!facets.length) return P.zero;
  const sum = facets.reduce(
    (total, key) => total + (traits[key] ?? P.zero),
    P.zero,
  );
  return Math.max(-P.one, Math.min(P.one, sum / facets.length));
}

/**
 * A person's year of living costs, or their household's if that is larger: a
 * person still in their parents' household has costs only there.
 */
function yearOf(core: Readonly<CoreState>, personId: PersonId): number {
  const person = core.people.get(personId);
  if (!person) return P.zero;
  const household = core.households.get(person.householdId);
  const daily = (household?.memberIds ?? []).reduce(
    (total, id) =>
      total + (core.people.get(id)?.livingCostDailyMinor ?? P.zero),
    P.zero,
  );
  return (
    Math.max(person.livingCostDailyMinor, daily) *
    parameter("daysPerMeanYear", core.data.parameters)
  );
}

/**
 * One read, between 0 and 1, with the record ids it came from. A record the
 * records do not hold reads as nothing (0), never as a guess.
 */
function readOf(
  core: Readonly<CoreState>,
  spec: ReadSpec,
  input: VariantInput,
  recordIds: Set<string>,
): number {
  if (spec.when && input.cause.facts[spec.when.fact] !== spec.when.is)
    return P.zero;
  if (spec.kind === "setting")
    return input.setting === spec.is ? P.one : P.zero;
  if (spec.kind === "strain") {
    // The corruption engine's own shape for money pressure, over a year.
    const asker = core.people.get(input.askerId);
    if (!asker) return P.zero;
    const year =
      asker.livingCostDailyMinor *
      parameter("daysPerMeanYear", core.data.parameters);
    return clamp(year / (year + asker.liquidMinor + P.one));
  }
  if (spec.kind === "care-need") {
    const person = core.people.get(input.askerId);
    if (!person) return P.zero;
    if (spec.whose === "self") {
      const need = careNeedOf(core, input.askerId);
      if (need > P.zero) recordIds.add(input.askerId);
      return clamp(need);
    }
    let most = P.zero;
    let who: PersonId | undefined;
    for (const id of core.households.get(person.householdId)?.memberIds ?? []) {
      if (id === input.askerId || !core.people.get(id)?.alive) continue;
      const need = careNeedOf(core, id);
      if (need > most) [most, who] = [need, id];
    }
    if (who) recordIds.add(who);
    return clamp(most);
  }
  if (spec.kind === "person-rows") {
    if (!core.modules.has(spec.module)) return P.zero;
    const rows = coreAPI(core as CoreState)
      .moduleState(spec.module)
      .table(spec.table)
      .query(spec.index, [input.askerId]) as unknown as {
      id: string;
      date: string;
    }[];
    let count = P.zero;
    for (const row of rows) {
      if (row.date >= input.cause.date) continue;
      if (daysBetweenText(row.date, input.cause.date) > spec.within.value)
        continue;
      if (
        Object.entries(spec.where ?? {}).some(
          ([key, want]) =>
            (row as unknown as Record<string, unknown>)[key] !== want,
        )
      )
        continue;
      count += P.one;
      recordIds.add(row.id);
    }
    return count / (count + spec.scale.value);
  }
  if (spec.kind === "household-case") {
    const person = core.people.get(input.askerId);
    if (!person || !core.modules.has(spec.module)) return P.zero;
    const rows = (
      coreAPI(core as CoreState)
        .moduleState(spec.module)
        .table(spec.table)
        .query(spec.index, [person.householdId]) as unknown as {
        id: string;
        open?: boolean;
      }[]
    )
      .filter((row) => row.open)
      .sort((a, b) => b.id.localeCompare(a.id));
    const row = rows[P.zero];
    if (!row) return P.zero;
    recordIds.add(row.id);
    if (!spec.field) return P.one;
    const value = fieldOf(row, spec.field);
    if (value === undefined) return P.zero;
    if (spec.against) {
      const year = yearOf(core, input.askerId);
      return clamp(value / (value + year + P.one));
    }
    if (spec.scale) return clamp(value / (value + spec.scale.value));
    return clamp(value);
  }
  if (spec.kind === "closeness") {
    const a = input.askerId < input.askedId ? input.askerId : input.askedId;
    const b = a === input.askerId ? input.askedId : input.askerId;
    const tieId = `${a}:${b}`;
    if (!core.relationships.has(tieId)) return P.zero;
    recordIds.add(tieId);
    return clamp(closenessBetween(core, input.askerId, input.askedId));
  }
  if (spec.kind === "shared-party") {
    const mine = partyTie(coreAPI(core as CoreState), input.askerId)?.partyId;
    const theirs = partyTie(coreAPI(core as CoreState), input.askedId)?.partyId;
    if (!mine || mine !== theirs) return P.zero;
    recordIds.add(mine);
    return P.one;
  }
  if (spec.kind === "holds-post") {
    if (!core.modules.has(LEADERSHIP_MODULE_ID)) return P.zero;
    const post = coreAPI(core as CoreState)
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .rows()
      .find((row) => (row as { holderId?: string }).holderId === input.askerId);
    if (!post) return P.zero;
    recordIds.add(post.id);
    return P.one;
  }
  if (spec.kind === "favor-given") {
    const given = favorsGiven(
      core,
      input.askerId,
      input.askedId,
      input.cause.date,
      input.cause.facts.billId,
    );
    for (const row of given) recordIds.add(row.voteId);
    return given.length / (given.length + spec.scale.value);
  }
  if (spec.kind === "town-on-bill") {
    const billId = input.cause.facts.billId;
    if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return P.zero;
    const api = coreAPI(core as CoreState);
    const bill = billOf(api, billId);
    if (!bill) return P.zero;
    const margins = bill.provisions.flatMap((provision) => {
      const stance = provisionStance(api, provision);
      if (!stance || stance.position === P.zero) return [];
      const sides = electorateSides(api, stance.question);
      return [
        stance.position > P.zero ? sides.yes - sides.no : sides.no - sides.yes,
      ];
    });
    if (!margins.length) return P.zero;
    recordIds.add(bill.id);
    const mean = margins.reduce((a, b) => a + b, P.zero) / margins.length;
    return clamp(spec.side === "for" ? mean : -mean);
  }
  if (spec.kind === "fact-map") {
    const level = input.cause.facts[spec.fact];
    const value = level === undefined ? undefined : spec.values[level];
    if (value === undefined) return P.zero;
    recordIds.add(input.cause.id);
    return clamp(value);
  }
  if (spec.kind === "quarrel") {
    const a = input.askerId < input.askedId ? input.askerId : input.askedId;
    const b = a === input.askerId ? input.askedId : input.askerId;
    const tieId = `${a}:${b}`;
    const change = core.relationships.get(tieId)?.latestChange?.requestedChange;
    if (change === undefined || change >= P.zero) return P.zero;
    recordIds.add(tieId);
    return P.one;
  }
  if (spec.kind === "national-outlet") {
    const outlet = outletsHere(coreAPI(core as CoreState)).find((row) =>
      row.reporterIds.includes(input.askerId),
    );
    if (!outlet || outlet.tier !== "national") return P.zero;
    recordIds.add(outlet.id);
    return P.one;
  }
  if (spec.kind === "scandal") {
    const stories = scandalStoriesOf(
      coreAPI(core as CoreState),
      input.askedId,
      input.cause.date,
    );
    for (const id of stories) recordIds.add(id);
    return stories.length / (stories.length + spec.scale.value);
  }
  if (spec.kind === "town-against") {
    const billId = input.cause.facts.billId;
    const vote = billId
      ? votesOf(coreAPI(core as CoreState), input.askedId).find(
          (row) => row.billId === billId,
        )
      : undefined;
    if (!vote || vote.stance.position === P.zero) return P.zero;
    const sides = electorateSides(
      coreAPI(core as CoreState),
      vote.stance.question,
    );
    const mine = vote.stance.position > P.zero;
    recordIds.add(vote.id);
    return clamp(mine ? sides.no - sides.yes : sides.yes - sides.no);
  }
  if (spec.kind === "fact") {
    const value = Number(input.cause.facts[spec.fact]);
    if (!Number.isFinite(value)) return P.zero;
    recordIds.add(input.cause.id);
    if (spec.against) {
      const year = yearOf(
        core,
        spec.against === "asker-year" ? input.askerId : input.askedId,
      );
      // No year of living costs on record reads as nothing, never as a gift
      // that dwarfs a year of zero.
      if (year <= P.zero) return P.zero;
      return clamp(value / (value + year * (spec.of?.value ?? P.one) + P.one));
    }
    if (spec.scale) return clamp(value / (value + spec.scale.value));
    return clamp(value);
  }
  if (spec.kind === "history") {
    const own = input.cause.facts[spec.exceptSameFact];
    let count = P.zero;
    for (const kind of spec.events)
      for (const id of core.logByKind.get(kind) ?? []) {
        const event = core.durableLog.get(id);
        if (!event || event.id === input.cause.id) continue;
        if (event.date >= input.cause.date) continue;
        if (
          spec.where &&
          Object.entries(spec.where).some(
            ([key, want]) => event.facts?.[key] !== want,
          )
        )
          continue;
        if (own !== undefined && event.facts?.[spec.exceptSameFact] === own)
          continue;
        if (
          spec.within &&
          daysBetweenText(event.date, input.cause.date) > spec.within.value
        )
          continue;
        const named = [...event.personIds, ...(event.witnessIds ?? [])];
        if (!named.includes(input.askedId)) continue;
        if (spec.named !== "asked" && !named.includes(input.askerId)) continue;
        count += P.one;
        recordIds.add(event.id);
      }
    return count / (count + spec.scale.value);
  }
  // A number on a module's record, named by the cause.
  const rowId = input.cause.facts[spec.idFact];
  if (!rowId || !core.modules.has(spec.module)) return P.zero;
  const row = coreAPI(core as CoreState)
    .moduleState(spec.module)
    .table(spec.table)
    .get(rowId);
  if (spec.equals !== undefined) {
    let at: unknown = row;
    for (const step of spec.field.split("."))
      at =
        typeof at === "object" && at !== null
          ? (at as Record<string, unknown>)[step]
          : undefined;
    if (at !== spec.equals) return P.zero;
    recordIds.add(rowId);
    return P.one;
  }
  const value = row ? fieldOf(row, spec.field) : undefined;
  if (value === undefined) return P.zero;
  recordIds.add(rowId);
  if (spec.against) {
    const year = yearOf(core, input.askedId);
    return clamp(value / (value + year + P.one));
  }
  if (spec.scale) return clamp(value / (value + spec.scale.value));
  return clamp(value);
}

/** The variant that plays a family's plain arc when the family keeps its own. */
const PLAIN_VARIANT = "plain";

/**
 * Which variant of the scene's purpose the records give, or null when the
 * purpose has none (it plays its one arc).
 */
export function chooseVariant(
  core: Readonly<CoreState>,
  input: VariantInput,
): VariantChoice | null {
  const family = DATA.families[input.family];
  if (!family) return null;
  // A cause plays one variant for as long as its scene is open: the asker's
  // cash moves day to day, and a tree that changed under the player's reply
  // would match it to the wrong line. The first choice stands.
  let kept = CHOSEN.get(core);
  if (!kept) CHOSEN.set(core, (kept = new Map()));
  const memo = `${input.family}|${input.cause.id}`;
  const chosen = kept.get(memo);
  if (chosen) return chosen;
  directorStopgap("SG-STORY-arc-variant-weights", WORDS_STOPGAP_HITS);
  const recordIds = new Set<string>();
  const reads: Record<string, number> = {};
  const read = (name: string) =>
    (reads[name] ??= readOf(core, DATA.reads[name]!, input, recordIds));
  // Every read the family names is read, whichever variants are open: the
  // scene's facts cite them (`read-...`), and a closed variant's records are
  // still true of the asker.
  for (const row of Object.values(family.variants))
    for (const term of row.terms ?? []) read(term.read);
  const scores: VariantScore[] = Object.entries(family.variants)
    .filter(([, row]) => {
      if (row.onlyFor && input.cause.facts[row.onlyFor.fact] !== row.onlyFor.is)
        return false;
      const named = row.forCause && input.cause.facts[row.forCause.fact];
      return !named || named === row.forCause!.is;
    })
    .map(([variant, row]) => {
      const world = (row.terms ?? []).reduce((total, term) => {
        const value = read(term.read);
        return total + term.weight * (term.low ? P.one - value : value);
      }, row.base);
      return {
        variant,
        purpose: row.purpose,
        score:
          Math.max(P.zero, world) *
          (P.one + pullOf(core, input.askerId, row.pull ?? [])),
      };
    })
    .sort((a, b) => b.score - a.score || a.variant.localeCompare(b.variant));
  // A return visit plays the next one down only where it holds its own
  // against the family's plain arc: a tie made by the first knock alone is
  // not someone who knows the player.
  // The plain arc is the family's own purpose, or the variant named "plain"
  // where a family keeps its own plain arc (the door families, whose endings
  // are the resident's answers).
  const plain =
    scores.find(
      (row) => row.purpose === input.family || row.variant === PLAIN_VARIANT,
    )?.score ?? P.zero;
  const second = scores[P.one];
  const best =
    input.nextDown && second && second.score > P.zero && second.score >= plain
      ? second
      : scores[P.zero]!;
  const choice: VariantChoice = {
    variant: best.variant,
    purpose: best.purpose,
    family: input.family,
    scores,
    reads,
    recordIds: [...recordIds].sort(),
  };
  kept.set(memo, choice);
  return choice;
}

/** The variant each cause has played, per world: the first choice stands. */
const CHOSEN = new WeakMap<object, Map<string, VariantChoice>>();
