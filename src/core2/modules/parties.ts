/**
 * Parties (M2-08): real organizations with members, a leader and rules; each
 * person's tie comes from their views plus loyalty; "no party" and
 * "independent" both exist; nothing assumes two parties.
 *
 * A state's parties are the ones on its 2024 presidential ballot (Clerk of
 * the House) or holding its legislative seats (Open States), each a party
 * organization in the world with the state's nomination rules. A town's
 * adults tie to parties so the town matches real party identification: the
 * share who identify with a party (Gallup 2024) take the party whose side
 * their lean is on, each party's share of identifiers following its share of
 * the state's 2024 vote, firmest leans first; of the rest, those who weigh
 * things carefully call themselves independent and the share who lean nowhere
 * (Pew 2024) have no party. Loyalty keeps a tie once made: ties are set at
 * the opening and stay put while views stay put; changing parties waits on
 * PEOPLE's views engine moving someone's views (until then views don't move).
 */
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import partyCounts from "../../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import delegates from "../../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import nomination from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import parameters from "../data/campaigns/parameters.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { lifePlaceByKey } from "../../simulation/life-places";
import { personLean } from "../campaign-views";

export const PARTIES_MODULE_ID = "core2-parties-v1";

export interface PartyRow {
  readonly id: string;
  readonly name: string;
  readonly stateKey: string;
  readonly organizationId: string;
  /** Its share of the state's 2024 vote (or of its legislative seats where no presidential vote). */
  readonly share: number;
  /** -1 for the Democratic family, +1 for the Republican family, 0 for any other. */
  readonly side: number;
  readonly nominationMethod: string | null;
  readonly voterAccess: string | null;
  readonly leaderId: string | null;
  readonly source: string;
}

export interface TieRow {
  readonly id: string;
  readonly personId: string;
  readonly tie: "party" | "independent" | "no-party";
  readonly partyId: string | null;
  readonly since: string;
  readonly lean: number;
  readonly reason: string;
}

export const PARTIES_MODULE: CoreModule = {
  id: PARTIES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      parties: {},
      ties: {
        indexes: {
          byParty: { fields: ["partyId"] },
          byTie: { fields: ["tie"] },
        },
      },
    },
  },
};

const NOT_PARTIES =
  /write-in|independent|petition|unaffiliated|^none$|no party|nonpartisan|unknown/i;

function value(key: string): number {
  return (parameters as { parameters: Record<string, { value: number }> })
    .parameters[key]!.value;
}

function sideOf(name: string): number {
  if (/^democrat|popular democr/i.test(name)) return -1;
  if (/^republican|nuevo progresista/i.test(name)) return 1;
  return 0;
}

/** The parties of one state, with their shares, from the 2024 ballot or the legislature. */
export function stateParties(
  stateKey: string,
): readonly { name: string; share: number; source: string }[] {
  const usps = stateKey.slice(3);
  const president = (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        rawLabels: string[];
        totalsByParty: Record<string, number>;
      }[];
    }
  ).presidentialByState.find((r) => r.stateUsps === usps);
  if (president) {
    const total = Object.values(president.totalsByParty).reduce(
      (a, b) => a + b,
      0,
    );
    return president.rawLabels
      .filter((label) => !NOT_PARTIES.test(label))
      .map((label) => {
        const key = label
          .toLowerCase()
          .replace(/[^a-z]+/g, "-")
          .replace(/^-|-$/g, "");
        return {
          name: label,
          share: total ? (president.totalsByParty[key] ?? 0) / total : 0,
          source:
            "Clerk of the House, Statistics of the Presidential and Congressional Election of November 5, 2024 (data/source/electoral-calibration-2024)",
        };
      });
  }
  const chambers =
    (
      partyCounts as unknown as {
        places: Record<
          string,
          Record<string, { parties: Record<string, number> }>
        >;
      }
    ).places[stateKey] ?? {};
  const seats = new Map<string, number>();
  for (const chamber of Object.values(chambers))
    for (const [name, n] of Object.entries(chamber.parties))
      if (!NOT_PARTIES.test(name)) seats.set(name, (seats.get(name) ?? 0) + n);
  const total = [...seats.values()].reduce((a, b) => a + b, 0);
  if (!total) {
    // A territory with no roster: the parties of its 2024 delegate race.
    const race = (
      delegates as unknown as {
        places: Record<
          string,
          { democraticPercent: number; republicanPercent: number }
        >;
      }
    ).places[usps];
    if (!race) return [];
    return [
      ["Democratic", race.democraticPercent],
      ["Republican", race.republicanPercent],
    ].map(([name, percent]) => ({
      name: name as string,
      share: (percent as number) / 100,
      source:
        "2024 U.S. House delegate result (data/research/elections/house-delegates-2024.json)",
    }));
  }
  return [...seats].map(([name, n]) => ({
    name,
    share: total ? n / total : 0,
    source:
      "Open States current legislative roster (public domain): party seat shares",
  }));
}

/** Register the module, the state's parties and every adult's tie. */
export function openParties(core: CoreState): void {
  if (!core.modules.has(PARTIES_MODULE_ID))
    registerModule(core, PARTIES_MODULE);
  const api = coreAPI(core);
  const place = lifePlaceByKey(api.state.placeMetadata.placeKey ?? "");
  const stateKey = place!.stateJurisdictionKey!;
  api.moduleState(PARTIES_MODULE_ID).table("parties"); // tables exist even where elections are nonpartisan
  const rules = (
    nomination as unknown as {
      places: Record<
        string,
        { method?: string | null; voterAccess?: string | null }
      >;
    }
  ).places[stateKey];
  const town = place!.context.jurisdiction.id;
  const parties: PartyRow[] = [];
  for (const party of stateParties(stateKey)) {
    const id = `party:${stateKey}:${party.name.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    const organizationId = `organization:${id}`;
    if (!core.organizations.has(organizationId))
      api.addOrganization({
        id: organizationId,
        placeId: town,
        name: `${party.name} Party`.replace(/Party Party$/, "Party"),
        kind: "political-party",
        liquidMinor: 0,
        source: { tag: "SOURCED", citation: party.source, asOf: core.date },
      });
    parties.push({
      id,
      name: party.name,
      stateKey,
      organizationId,
      share: party.share,
      side: sideOf(party.name),
      nominationMethod: rules?.method ?? null,
      voterAccess: rules?.voterAccess ?? null,
      leaderId: null,
      source: party.source,
    });
  }
  // Every adult's tie, firmest leans first.
  const townLean =
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .map((p) => ({ p, lean: personLean(core.people, p, townLean) }))
    .sort(
      (a, b) =>
        Math.abs(b.lean) - Math.abs(a.lean) || a.p.id.localeCompare(b.p.id),
    );
  const identifiers = Math.round(adults.length * value("partyIdentifierShare"));
  const totalShare = parties.reduce((a, p) => a + p.share, 0) || 1;
  const quota = new Map(
    parties.map((p) => [
      p.id,
      Math.round((identifiers * p.share) / totalShare),
    ]),
  );
  const ties = api.moduleState(PARTIES_MODULE_ID).table("ties");
  const minor = parties
    .filter((p) => p.side === 0)
    .sort((a, b) => b.share - a.share);
  let assigned = 0;
  const rest: typeof adults = [];
  for (const entry of adults) {
    const side = Math.sign(entry.lean);
    const party =
      assigned < identifiers
        ? (parties.find(
            (p) => p.side === side && side !== 0 && (quota.get(p.id) ?? 0) > 0,
          ) ?? minor.find((p) => (quota.get(p.id) ?? 0) > 0))
        : undefined;
    if (!party) {
      rest.push(entry);
      continue;
    }
    quota.set(party.id, quota.get(party.id)! - 1);
    assigned += 1;
    put(
      ties,
      entry.p,
      "party",
      party.id,
      entry.lean,
      core.date,
      party.side === side ? "lean-matches-party" : "minor-party",
    );
  }
  // Of the rest: those who lean nowhere have no party; careful thinkers call themselves independent.
  const noParty = Math.round(adults.length * value("noPartyShare"));
  rest
    .sort(
      (a, b) =>
        Math.abs(a.lean) - Math.abs(b.lean) || a.p.id.localeCompare(b.p.id),
    )
    .forEach((entry, index) =>
      put(
        ties,
        entry.p,
        index < noParty &&
          (entry.p.traits["people-mind-v1:deliberation"] ?? 0) <= 0
          ? "no-party"
          : "independent",
        null,
        entry.lean,
        core.date,
        index < noParty ? "leans-nowhere" : "independent-minded",
      ),
    );
  // Each party's leader: its most outgoing, dutiful member in town.
  for (const party of parties) {
    const members = (ties.query("byParty", [party.id]) as unknown as TieRow[])
      .map((t) => core.people.get(t.personId)!)
      .sort(
        (a, b) =>
          (b.traits["people-mind-v1:sociability"] ?? 0) +
            (b.traits["personality-v1:facet-duty-bound"] ?? 0) -
            ((a.traits["people-mind-v1:sociability"] ?? 0) +
              (a.traits["personality-v1:facet-duty-bound"] ?? 0)) ||
          a.id.localeCompare(b.id),
      );
    for (const member of members) api.join(member.id, party.organizationId);
    api
      .moduleState(PARTIES_MODULE_ID)
      .table("parties")
      .put({
        ...party,
        leaderId: members[0]?.id ?? null,
      } as unknown as ModuleRow);
  }
}

function put(
  ties: ReturnType<ReturnType<CoreAPI["moduleState"]>["table"]>,
  person: Readonly<PersonState>,
  tie: TieRow["tie"],
  partyId: string | null,
  lean: number,
  date: string,
  reason: string,
) {
  ties.put({
    id: person.id,
    personId: person.id,
    tie,
    partyId,
    since: date,
    lean,
    reason,
  } as unknown as ModuleRow);
}

export function partyTie(api: CoreAPI, personId: string): TieRow | null {
  return (
    (api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .get(personId) as unknown as TieRow | undefined) ?? null
  );
}

export function partiesHere(api: CoreAPI): readonly PartyRow[] {
  return api
    .moduleState(PARTIES_MODULE_ID)
    .table("parties")
    .rows() as unknown as PartyRow[];
}
