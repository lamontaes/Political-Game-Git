/**
 * The full people are a representative sample of the town, plus the
 * player's circle (owner, Oct 12, ruling 4). Before the town collapses to
 * two levels, its households outside the circle are grouped by the oldest
 * member's age band and the household's pay (above or below the median), and one household
 * per group stays full. Which household is seeded (generation of who exists);
 * each of its people stands for their group's share of the town (a weight),
 * for estimates such as polls and views. The counted voter groups still cast
 * the counted people's votes, so weights are for estimating, not voting.
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import data from "./data/representative-sample.json" with { type: "json" };
import type { CoreInput, PersonId } from "./types";

export interface RepresentativeSample {
  /** Everyone in the sampled households. */
  personIds: Set<PersonId>;
  /** How many town residents each sampled person stands for. */
  weights: Record<PersonId, number>;
  strata: {
    key: string;
    households: number;
    people: number;
    sampled: string;
  }[];
}

export function representativeSample(
  input: CoreInput,
  keep: ReadonlySet<PersonId>,
): RepresentativeSample {
  const start = makeIsoDate(input.startedAt);
  const people = new Map(input.people.map((row) => [row.id, row]));
  const town = input.people.find((row) => row.id === input.playerId)?.placeId;
  const pay = new Map<PersonId, number>();
  for (const job of input.jobs)
    pay.set(job.personId, (pay.get(job.personId) ?? 0) + job.wageDailyMinor);
  const homes = input.households
    .filter(
      (home) =>
        (!town || home.placeId === town) &&
        home.memberIds.length > 0 &&
        !home.memberIds.some((id) => keep.has(id)),
    )
    .map((home) => {
      const ages = home.memberIds.map((id) =>
        ageOnDate(makeIsoDate(people.get(id)!.birthDate), start),
      );
      return {
        home,
        oldest: Math.max(...ages),
        pay: home.memberIds.reduce((n, id) => n + (pay.get(id) ?? 0), 0),
      };
    })
    .filter((row) => row.oldest >= data.ageBands[0]!.minAge);
  const sortedPay = homes.map((row) => row.pay).sort((a, b) => a - b);
  const cut = (share: number) =>
    sortedPay[Math.floor(share * (sortedPay.length - 1))] ?? 0;
  const cuts = data.payShares.map(cut);
  const strata = new Map<string, typeof homes>();
  for (const row of homes) {
    const band = [...data.ageBands]
      .reverse()
      .find((band) => row.oldest >= band.minAge)!.label;
    const level = cuts.filter((value) => row.pay > value).length;
    const key = `${band}|pay-${level + 1}`;
    const list = strata.get(key);
    if (list) list.push(row);
    else strata.set(key, [row]);
  }
  const sample: RepresentativeSample = {
    personIds: new Set(),
    weights: {},
    strata: [],
  };
  for (const [key, rows] of [...strata].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const chosen = [...rows].sort((a, b) =>
      stableHash(`${input.seed}:${data.version}:${a.home.id}`).localeCompare(
        stableHash(`${input.seed}:${data.version}:${b.home.id}`),
      ),
    )[0]!;
    const represented = rows.reduce(
      (n, row) => n + row.home.memberIds.length,
      0,
    );
    for (const id of chosen.home.memberIds) {
      sample.personIds.add(id);
      sample.weights[id] = represented / chosen.home.memberIds.length;
    }
    sample.strata.push({
      key,
      households: rows.length,
      people: represented,
      sampled: chosen.home.id,
    });
  }
  return sample;
}

/** How many town residents each sampled full person stands for. */
export function representativeWeights(core: {
  placeMetadata?: Readonly<Record<string, string>>;
}): Readonly<Record<PersonId, number>> {
  const raw = core.placeMetadata?.representativeWeights;
  return raw ? (JSON.parse(raw) as Record<PersonId, number>) : {};
}
