/**
 * Public figures are known (owner, Oct 14, 2026): everyone knows what the
 * public knows about the president, the vice president, their governor,
 * their members of Congress and their mayor, distinct from having met them.
 *
 * Each figure gets one record of what the public knows: the office and when
 * they took it, their stated positions (their own causes first), their
 * record on day one (votes, laws sponsored and signed), the election that
 * seated them and their campaign promises, and their reputation: the traits a
 * public sees, furthest from the middle first. Internals stay internal.
 *
 * Knowledge records: each full person the figure's office covers, old enough
 * to follow public life, holds the figure's name, public role and a pointer to
 * the record, with access "public" and learned when the figure took office or
 * the person came of age for it. Knowing a figure this way never adds them to
 * the people a person has met. A promise counts with a voter only when they
 * heard it made (the record engine), so each covered person who would have
 * heard the campaign by the news engine's rule holds the promise too.
 */
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import publicTraits from "./data/past/public-traits.json" with { type: "json" };
import { members } from "./modules/legislature";
import { votesOf } from "./modules/record";
import type { TermRow } from "./modules/offices";
import { strongestQuestions } from "./past-elections";
import { heardOn } from "./past-news";
import { townOffices, type PastOffice, type PastTown } from "./past-bodies";
import {
  pastParameter,
  pastTable,
  putPast,
  shiftDays,
  type LawHistoryRow,
  type PastElectionRow,
  type PublicFigureRow,
} from "./past-module";
import type { EntityId } from "../simulation/types";
import type { CoreAPI, PersonState } from "./types";

const PUBLIC = publicTraits as unknown as {
  traits: readonly string[];
  reputationTraits: { value: number };
  statedPositions: { value: number };
};

/** The offices whose holders are public figures, and who would know them. */
const FIGURE_SCOPES: Readonly<Record<string, "nation" | "state" | "town">> = {
  president: "nation",
  "vice-president": "nation",
  "us-senate": "state",
  "us-house": "state",
  governor: "state",
  mayor: "town",
};

export function figureKey(personId: string): string {
  return `person:${personId}:public`;
}

function scopeOf(town: PastTown, kind: string): string {
  const scope = FIGURE_SCOPES[kind]!;
  return scope === "nation"
    ? "US"
    : scope === "state"
      ? town.stateKey
      : town.townPlaceId;
}

/** Whether a person lives where a figure's public would know them. */
export function inPublicOf(
  person: Readonly<PersonState>,
  scope: string,
): boolean {
  if (scope === "US") return true;
  if (person.placeId === scope) return true;
  return (
    lifePlaceByJurisdictionId(person.placeId as unknown as EntityId)
      ?.stateJurisdictionKey === scope
  );
}

/** What the public knows about a figure, for a person who would know it; null otherwise. */
export function publicKnowledgeOf(
  api: CoreAPI,
  viewerId: string,
  figureId: string,
): (PublicFigureRow & { readonly met: boolean }) | null {
  const viewer = api.state.people.get(viewerId);
  if (!viewer || !api.knows(viewerId, figureKey(figureId))) return null;
  const row = (
    pastTable(api, "figures").query("byPerson", [
      figureId,
    ]) as unknown as PublicFigureRow[]
  )[0];
  return row ? { ...row, met: viewer.knownIds.has(figureId) } : null;
}

export function buildPublicFigures(
  api: CoreAPI,
  town: PastTown,
  past: {
    elections: readonly PastElectionRow[];
    histories: readonly LawHistoryRow[];
  },
): readonly PublicFigureRow[] {
  const awareness = pastParameter(api, "pastPublicAwarenessAge");
  const people = [...api.state.people.values()].filter((p) => p.alive);
  const figures: PublicFigureRow[] = [];
  // The president and vice president are known everywhere, territories
  // included, whether or not their seats cover the town.
  const national = (
    api
      .moduleState("core2-offices-v1")
      .table("offices")
      .rows() as unknown as PastOffice[]
  ).filter((o) => FIGURE_SCOPES[o.kind] === "nation" && !o.coversTown);
  for (const office of [...townOffices(api), ...national]) {
    if (!(office.kind in FIGURE_SCOPES)) continue;
    const seats = (
      api
        .moduleState("core2-offices-v1")
        .table("seats")
        .query("byOffice", [office.id]) as unknown as {
        id: string;
        coversTown: boolean;
      }[]
    ).filter((s) => s.coversTown || FIGURE_SCOPES[office.kind] === "nation");
    const holders = members(api, office.id).filter(
      (t): t is TermRow & { personId: string } =>
        !!t.personId &&
        api.state.people.has(t.personId) &&
        seats.some((s) => s.id === t.seatId),
    );
    for (const term of holders) {
      const person = api.state.people.get(term.personId)!;
      const election =
        past.elections.find((e) => e.winnerId === term.personId) ?? null;
      const reputation = PUBLIC.traits
        .filter((trait) => trait in person.traits)
        .map((trait) => ({ trait, strength: person.traits[trait]! }))
        .sort(
          (a, b) =>
            Math.abs(b.strength) - Math.abs(a.strength) ||
            a.trait.localeCompare(b.trait),
        )
        .slice(0, PUBLIC.reputationTraits.value);
      const row: PublicFigureRow = {
        id: `public-figure:${term.personId}`,
        personId: term.personId,
        officeId: office.id,
        seatId: term.seatId,
        scope: scopeOf(town, office.kind),
        party: term.party,
        serviceStart: term.serviceStart ?? term.startDate,
        positions: strongestQuestions(
          api,
          term.personId,
          PUBLIC.statedPositions.value,
        ),
        reputation,
        votesOnRecord: votesOf(api, term.personId).length,
        lawsSponsored: past.histories.filter(
          (h) => h.sponsorId === term.personId,
        ).length,
        lawsSigned: past.histories.filter((h) => h.signedBy === term.personId)
          .length,
        electionId: election?.id ?? null,
        promiseIds: election?.promiseIds ?? [],
      };
      putPast(api, "figures", row);
      figures.push(row);
      const known =
        row.serviceStart < town.opening ? row.serviceStart : town.opening;
      for (const viewer of people) {
        if (viewer.id === term.personId || !inPublicOf(viewer, row.scope))
          continue;
        const born = makeIsoDate(viewer.birthDate);
        if (ageOnDate(born, makeIsoDate(town.opening)) < awareness) continue;
        const cameOfAge = shiftDays(
          viewer.birthDate,
          Math.ceil(awareness * pastParameter(api, "pastDaysPerYear")),
        );
        const learnedAt = cameOfAge > known ? cameOfAge : known;
        const fact = (key: string, value: string) =>
          api.observe(viewer.id, {
            key,
            value,
            learnedAt,
            sourceId: row.id,
            access: "public",
          });
        fact(
          `person:${term.personId}:name`,
          `${person.givenName} ${person.familyName}`,
        );
        fact(`person:${term.personId}:public-role`, office.id);
        fact(figureKey(term.personId), row.id);
      }
    }
  }
  // Each campaign promise of a seat covering the town, for the people who
  // would have heard the campaign.
  const residents = people.filter((p) => p.placeId === town.townPlaceId);
  for (const election of past.elections)
    for (const promiseId of election.promiseIds) {
      const date = shiftDays(
        election.date,
        -pastParameter(api, "pastCampaignLeadDays"),
      );
      for (const viewer of residents) {
        const on = heardOn(api, viewer, date);
        if (!on || on > town.opening) continue;
        api.observe(viewer.id, {
          key: promiseId,
          value: election.winnerId,
          learnedAt: on,
          sourceId: election.id,
          access: "public",
        });
      }
    }
  return figures;
}
