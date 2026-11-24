/**
 * The world's story an address opens on (Story thread #9750, part 4; owner,
 * Nov 16: "it's a real speech. It's a mix of hopefulness, maybe a little
 * braggadocious, and sets expectations ... or maybe it's warning because in
 * this generated world, you know, maybe the economy's been terrible ... or
 * maybe corruption"). Before the planner reads the speaker's own issues it
 * reads what the world has been through, from its records:
 *
 * - **the economy's run**: the macro months over the last `runYears` years,
 *   how far prices outran pay or pay outran prices and whether more or fewer
 *   people were out of work at the end than at the start, and whether the
 *   speaker governed those years or inherited them;
 * - **a disaster**: the country's declared disasters of the past year for
 *   the President (the national events engine's rows), the place's own for a
 *   governor or a local head (the disasters engine's);
 * - **a scandal**: a bribe taken to the press about a member of the body the
 *   speaker addresses (the corruption engine's reported record).
 *
 * Each is a story row of `opening-address.json` (`stories`): the facts that
 * must hold (`gate`), what its amount is multiplied by (`weight`), and the
 * order of the sections its address says, so a warning and a brag do not
 * share a skeleton. The story with the highest weight times amount is the
 * address's; a tie goes by the story's name, and with none the address takes
 * the kind row's own order (`steady`). No roll. It holds no sentence: the
 * opening-speech bank's `story-open` and `story-turn` pieces of the story's
 * topic say it.
 */
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import type { MacroMonth } from "../core2/macro-model";
import { monthKey, shiftMonth } from "../core2/macro-model";
import { P } from "../core2/parameters";
import { addDays, daysBetweenText } from "../core2/kernel/dates";
import type { IsoDate } from "../core2/kernel/brands";
import {
  NATIONAL_EVENTS_MODULE_ID,
  nationalEvents,
} from "../core2/modules/national-events";
import { DISASTERS_MODULE_ID, townDisasters } from "../core2/modules/world";
import { townSeats } from "../core2/modules/offices";
import { SCANDAL_REPORTED } from "../core2/modules/justice";
import { coreStateName } from "../core2/place-lookup";
import { countSaid } from "../english/count-words";
import addressData from "./data/opening-address.json" with { type: "json" };
import type { GroundedEnglishFact } from "../english/grounded-english";
import type { EntityId } from "../core2/kernel/brands";

type Facts = Record<string, GroundedEnglishFact>;
const fact = (text: string, ...ids: string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as EntityId[],
});

interface Weight {
  readonly value: number;
}
/** A story row: the facts it needs, its weight, and its order by level. */
interface StoryRow {
  readonly gate: readonly string[];
  readonly weight: Weight;
  /** The sections in order, by the speech's level ("federal", "local"); a level it has none for takes the kind row's own. */
  readonly sections: Readonly<Record<string, readonly string[]>>;
}
interface StoryData {
  readonly runYears: Weight;
  readonly runLeast: Weight;
  readonly runScale: Weight;
  readonly ownShare: Weight;
  readonly disasterDays: Weight;
  readonly disasterStatesMany: Weight;
  readonly howFacts: readonly string[];
  readonly rows: Readonly<Record<string, StoryRow>>;
}
export const STORIES = (addressData as unknown as { stories: StoryData })
  .stories;

/** The story an address opens on: its row's name, the facts its pieces say, and its order. */
export interface AddressStory {
  readonly id: string;
  /** Its weight times its amount: what it won by. */
  readonly score: number;
  readonly facts: Facts;
  /** The sections in order, or null for the kind row's own. */
  readonly sections: readonly string[] | null;
}

/** What the planner knows about the speaker that the story reads. */
export interface StorySpeaker {
  readonly serviceStart: string;
  readonly federal: boolean;
  /** The speaker's state ("US-DE") for a governor; null otherwise. */
  readonly stateKey: string | null;
  /** The body a local head addresses, by its office row. */
  readonly bodyOfficeId?: string;
  /** The speaker's serving term, whose end says how many years are left. */
  readonly term?: { readonly id: string; readonly endDate: string };
}

/** The whole years left in the speaker's term, in words ("four years"), where the record holds its end. */
export function termLeft(
  core: CoreState,
  speaker: Pick<StorySpeaker, "term">,
): Facts {
  if (!speaker.term) return {};
  const years = Math.round(
    daysBetweenText(core.date, speaker.term.endDate) /
      coreAPI(core).parameter("daysPerMeanYear"),
  );
  if (years < P.one) return {};
  return {
    "term-left": fact(
      `${countSaid(years)} ${years === P.one ? "year" : "years"}`,
      speaker.term.id,
    ),
  };
}

/** How far an amount went, by the thirds of its scale: the fact a piece requires to say it mildly, steadily or sharply. */
function howFact(amount: number): string {
  const words = STORIES.howFacts;
  const at = Math.min(
    words.length - P.one,
    Math.floor((amount / STORIES.runScale.value) * words.length),
  );
  return words[Math.max(P.zero, at)]!;
}

/**
 * The economy over the last `runYears` years, from the macro months: how far
 * prices rose against pay (both as a percent of where they stood), and
 * whether unemployment ended higher or lower. The amount is the gap between
 * prices and pay in points, plus the change in unemployment; its sign says
 * whether the run was hard or good.
 */
export function economyRun(
  months: readonly MacroMonth[],
  now: string,
  serviceStart: string,
  p: (key: string) => number,
): { facts: Facts; amount: number } {
  const end = months.filter((row) => row.month <= monthKey(now)).at(-P.one);
  const years = STORIES.runYears.value;
  if (!end) return { facts: {}, amount: P.zero };
  const startMonth = shiftMonth(end.month, -years * p("macroMonthsPerYear"), p);
  // The earliest month the record keeps inside the span (the coarse years
  // begin with the latest full-data year).
  const start = months.find((row) => row.month >= startMonth);
  if (!start || start === end || !start.priceIndex || !start.hourlyEarnings)
    return { facts: {}, amount: P.zero };
  // The span said is the whole years the record covers.
  const span = Math.round(
    daysBetweenText(`${start.month}-01`, `${end.month}-01`) /
      p("daysPerMeanYear"),
  );
  if (span < P.one) return { facts: {}, amount: P.zero };
  const pct = (to: number, from: number) =>
    (to / from - P.one) * p("macroHundred");
  const prices = pct(end.priceIndex, start.priceIndex);
  const pay = pct(end.hourlyEarnings, start.hourlyEarnings);
  const jobless = end.unemploymentPct - start.unemploymentPct;
  // Points of pay lost to prices, and points of unemployment gained: both
  // make a run hard; their opposites make it good.
  const amount = prices - pay + jobless;
  const ids = [start.id, end.id];
  // Whether the speaker governed the run: the share of its days since the
  // speaker took office.
  const spanDays = daysBetweenText(`${start.month}-01`, `${end.month}-01`);
  const ownDays = Math.max(
    P.zero,
    daysBetweenText(serviceStart, `${end.month}-01`),
  );
  const own = spanDays > P.zero && ownDays / spanDays >= STORIES.ownShare.value;
  const facts: Facts = {};
  if (Math.abs(amount) < STORIES.runLeast.value) return { facts, amount };
  const hard = amount > P.zero;
  facts[hard ? "run-hard" : "run-good"] = fact("yes", ...ids);
  facts[own ? "run-own" : "run-inherited"] = fact("yes", ...ids);
  facts["run-span"] = fact(
    `${countSaid(span)} ${span === P.one ? "year" : "years"}`,
    ...ids,
  );
  facts[howFact(Math.abs(amount))] = fact("yes", ...ids);
  if (hard && prices > pay) facts["run-prices-ahead"] = fact("yes", ...ids);
  if (!hard && pay > prices) facts["run-pay-ahead"] = fact("yes", ...ids);
  if (jobless > P.zero) facts["run-jobs-lost"] = fact("yes", ...ids);
  if (jobless < P.zero) facts["run-jobs-gained"] = fact("yes", ...ids);
  return { facts, amount: Math.abs(amount) };
}

/** The disaster of the past year the speaker's country, state or place lived through, weighted down over `disasterDays`. */
function disasterRun(
  core: CoreState,
  speaker: StorySpeaker,
): { facts: Facts; amount: number } {
  const api = coreAPI(core);
  const days = STORIES.disasterDays.value;
  const since = addDays(core.date as IsoDate, -days);
  const recency = (date: string) =>
    Math.max(P.zero, P.one - daysBetweenText(date, core.date) / days);
  if (speaker.federal || speaker.stateKey) {
    if (!core.modules.has(NATIONAL_EVENTS_MODULE_ID))
      return { facts: {}, amount: P.zero };
    const rows = nationalEvents(api).filter(
      (row) =>
        row.date > since &&
        row.date <= core.date &&
        (speaker.federal || row.stateKey === speaker.stateKey),
    );
    const last = rows.at(-P.one);
    if (!last) return { facts: {}, amount: P.zero };
    const states = new Set(rows.map((row) => row.stateKey));
    const ids = rows.map((row) => row.id);
    const facts: Facts = {
      "story-disaster": fact(last.incidentType.toLowerCase(), last.id),
    };
    const where = coreStateName(last.stateKey.replace(/^US-/, ""));
    if (speaker.federal && where)
      facts["disaster-where"] = fact(where, last.id);
    if (speaker.federal && states.size >= STORIES.disasterStatesMany.value)
      facts["disaster-many"] = fact("yes", ...ids);
    return { facts, amount: recency(last.date) };
  }
  if (!core.modules.has(DISASTERS_MODULE_ID))
    return { facts: {}, amount: P.zero };
  const last = townDisasters(api)
    .filter((row) => row.declared > since && row.declared <= core.date)
    .sort((a, b) => b.declared.localeCompare(a.declared))[P.zero];
  return last
    ? {
        facts: {
          "story-disaster": fact(
            last.type.toLowerCase(),
            `disaster:${last.number}`,
          ),
        },
        amount: recency(last.declared),
      }
    : { facts: {}, amount: P.zero };
}

/** A bribe taken to the press this past year about a member of the body the speaker addresses. */
function scandalRun(
  core: CoreState,
  speaker: StorySpeaker,
): { facts: Facts; amount: number } {
  if (!speaker.bodyOfficeId) return { facts: {}, amount: P.zero };
  const api = coreAPI(core);
  const members = new Set(
    townSeats(api)
      .filter((row) => row.office.id === speaker.bodyOfficeId)
      .flatMap((row) => (row.holder?.personId ? [row.holder.personId] : [])),
  );
  const since = addDays(core.date as IsoDate, -STORIES.disasterDays.value);
  const reported = [...(core.logByKind.get(SCANDAL_REPORTED) ?? [])]
    .map((id) => core.durableLog.get(id))
    .filter(
      (event) =>
        !!event &&
        event.date > since &&
        members.has(String(event.facts?.officialId ?? "")),
    );
  if (!reported.length) return { facts: {}, amount: P.zero };
  return {
    facts: {
      "story-scandal": fact("yes", ...reported.map((event) => event!.id)),
    },
    amount: Math.min(P.one, reported.length),
  };
}

/**
 * The story this speaker's address opens on, from the world's records: the
 * story row whose gate holds with the highest weight times amount.
 */
export function storyOf(
  core: CoreState,
  speaker: StorySpeaker,
  months: readonly MacroMonth[],
): AddressStory {
  const reads: { facts: Facts; amount: number }[] = [
    speaker.federal
      ? economyRun(months, core.date, speaker.serviceStart, (key) =>
          coreAPI(core).parameter(key),
        )
      : { facts: {}, amount: P.zero },
    disasterRun(core, speaker),
    scandalRun(core, speaker),
  ];
  const levelKey = speaker.federal ? "federal" : "local";
  const best = Object.entries(STORIES.rows)
    .flatMap(([id, row]) => {
      if (!row.gate.length) return [];
      const read = reads.find((one) =>
        row.gate.every((key) => !!one.facts[key]),
      );
      if (!read || !row.sections[levelKey]) return [];
      return [{ id, row, read, score: row.weight.value * read.amount }];
    })
    .filter((one) => one.score > P.zero)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[P.zero];
  if (!best) return { id: "steady", score: P.zero, facts: {}, sections: null };
  return {
    id: best.id,
    score: best.score,
    facts: { ...best.read.facts, ...termLeft(core, speaker) },
    sections: best.row.sections[levelKey] ?? null,
  };
}
