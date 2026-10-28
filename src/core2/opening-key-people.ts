/**
 * The opening's key people (owner ruling, Oct 15, 2026, afternoon): the
 * president and vice president; the state's legislators; the most powerful
 * person in each chamber; and the player's own representatives. One list,
 * read by the opening story and the Politics screen, from the offices and
 * leadership records. No pick is made here: who is key follows from the
 * offices and from who holds the post that rules each chamber.
 */
import keyData from "./data/opening/key-people.json" with { type: "json" };
import { leaderOf } from "./modules/leadership";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  memberKey,
  members,
} from "./modules/legislature";
import {
  OFFICES_MODULE_ID,
  seatsOfOffices,
  townSeats,
} from "./modules/offices";
import { officialOf } from "./modules/officials";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, PersonId } from "./types";

export type KeyReason = (typeof keyData.reasons)[number];

/** One key person, with every reason they are key, and the records that say so. */
export interface KeyPerson {
  /** The resident's person id, or the official's id where they are not filled in. */
  readonly id: string;
  readonly name: string;
  readonly officeId: string;
  readonly officeKind: string;
  readonly officeTitle: string;
  /** The state their office is in (a state key), none for a national office. */
  readonly stateKey: string | null;
  /** The chamber they are the most powerful person of, and the post that makes them so. */
  readonly leads?: { readonly chamber: string; readonly post: string };
  readonly reasons: readonly KeyReason[];
  readonly sourceRecordIds: readonly string[];
}

interface OfficeRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly jurisdiction: string;
}

const DATA = keyData as unknown as {
  reasons: readonly KeyReason[];
  ownOffices: Record<string, readonly string[]>;
  mostPowerfulPost: Record<string, string>;
};

const offices = (api: CoreAPI) =>
  api.moduleState(OFFICES_MODULE_ID).table("offices");

/** The player's state, by its jurisdiction key. */
function stateOf(core: CoreState, playerId: PersonId): string | null {
  const player = core.people.get(playerId);
  return player
    ? (corePlaceByJurisdictionId(player.placeId as never)
        ?.stateJurisdictionKey ?? null)
    : null;
}

/** The chambers whose most powerful person is key: Congress's two and the player's state's own. */
function chambersOf(
  api: CoreAPI,
  state: string | null,
): readonly { id: string; kind: string }[] {
  const own = state
    ? (offices(api).query("byJurisdiction", [state]) as unknown as OfficeRow[])
    : [];
  return [
    { id: FEDERAL_HOUSE, kind: "us-house" },
    { id: FEDERAL_SENATE, kind: "us-senate" },
    ...own
      .filter((row) => row.kind.startsWith("legislature-"))
      .map((row) => ({ id: row.id, kind: row.kind })),
  ];
}

/** The chambers whose most powerful person is key for a player, as the leadership engine names them. */
export function keyChambersOf(
  core: CoreState,
  playerId: PersonId,
): readonly string[] {
  return chambersOf(coreAPI(core), stateOf(core, playerId)).map(
    (row) => row.id,
  );
}

/**
 * The key people for a player: the president and vice president, the state's
 * legislators, the most powerful person in each chamber, and the player's own
 * representatives, each once with all the reasons they are key.
 */
export function keyPeopleOf(
  core: CoreState,
  playerId: PersonId,
): readonly KeyPerson[] {
  const api = coreAPI(core);
  const state = stateOf(core, playerId);
  const found = new Map<
    string,
    {
      person: Omit<KeyPerson, "reasons" | "sourceRecordIds">;
      reasons: Set<KeyReason>;
      sources: Set<string>;
    }
  >();
  const add = (
    person: Omit<KeyPerson, "reasons" | "sourceRecordIds">,
    reason: KeyReason,
    ...sources: string[]
  ) => {
    const row = found.get(person.id) ?? {
      person,
      reasons: new Set<KeyReason>(),
      sources: new Set<string>(),
    };
    row.reasons.add(reason);
    for (const source of sources) row.sources.add(source);
    if (person.leads && !row.person.leads)
      row.person = { ...row.person, leads: person.leads };
    found.set(person.id, row);
  };
  const allOffices = offices(api).rows() as unknown as OfficeRow[];
  // An office's title by its id, else by its kind (a member of Congress is
  // seated in their own state's seat, which this world may not list by id).
  const titleOf = (officeId: string, kind?: string) =>
    allOffices.find((row) => row.id === officeId)?.title ??
    allOffices.find((row) => row.kind === kind)?.title ??
    "";

  // The seats over the player's town: the president, the vice president, and the player's own.
  const own = new Map<string, KeyReason>();
  for (const [reason, kinds] of Object.entries(DATA.ownOffices))
    for (const kind of kinds) own.set(kind, reason as KeyReason);
  // The President and Vice President are known to everyone, including a
  // territory's town whose voters do not choose them (owner ruling, Oct 19).
  const over = townSeats(api);
  const heads = seatsOfOffices(
    api,
    (offices(api).rows() as unknown as OfficeRow[]).filter(
      (row) => row.kind === "president" || row.kind === "vice-president",
    ) as never,
  ).filter(({ seat }) => !over.some((row) => row.seat.id === seat.id));
  for (const { office, seat, holder } of [...over, ...heads]) {
    if (!holder) continue;
    const reason: KeyReason | undefined =
      office.kind === "president" || office.kind === "vice-president"
        ? office.kind
        : own.get(office.kind);
    if (!reason) continue;
    add(
      {
        id: holder.personId ?? memberKey(holder),
        name: `${holder.identity.givenName} ${holder.identity.familyName}`,
        officeId: office.id,
        officeKind: office.kind,
        officeTitle: office.title,
        stateKey: /^US-[A-Z]{2}$/.test(office.jurisdiction)
          ? office.jurisdiction
          : null,
      },
      reason,
      seat.id,
      holder.id,
    );
  }

  // Every sitting legislator of the player's state.
  const chambers = chambersOf(api, state);
  for (const chamber of chambers.filter(
    (row) => row.id !== FEDERAL_HOUSE && row.id !== FEDERAL_SENATE,
  ))
    for (const term of members(api, chamber.id))
      add(
        {
          id: memberKey(term),
          name: `${term.identity.givenName} ${term.identity.familyName}`,
          officeId: chamber.id,
          officeKind: chamber.kind,
          officeTitle: titleOf(term.officeId, chamber.kind),
          stateKey: state,
        },
        "state-legislator",
        term.seatId,
        term.id,
      );

  // The most powerful person in each chamber.
  for (const chamber of chambers) {
    const post = DATA.mostPowerfulPost[chamber.kind];
    const id = post ? leaderOf(api, chamber.id, post) : null;
    if (!post || !id) continue;
    const term = members(api, chamber.id).find((row) => memberKey(row) === id);
    if (!term) continue;
    add(
      {
        id,
        name: `${term.identity.givenName} ${term.identity.familyName}`,
        officeId: term.officeId,
        officeKind: chamber.kind,
        officeTitle: titleOf(term.officeId, chamber.kind),
        // A member of Congress is named with the state they serve.
        stateKey:
          chamber.id === FEDERAL_HOUSE || chamber.id === FEDERAL_SENATE
            ? (officialOf(api, id)?.stateKey ?? null)
            : state,
        leads: { chamber: chamber.id, post },
      },
      "chamber-leader",
      `${chamber.id}:${post}`,
      term.seatId,
      term.id,
    );
  }

  const rank = (reasons: Iterable<KeyReason>) =>
    Math.min(...[...reasons].map((reason) => DATA.reasons.indexOf(reason)));
  return [...found.values()]
    .map(({ person, reasons, sources }) => ({
      ...person,
      reasons: DATA.reasons.filter((reason) => reasons.has(reason)),
      sourceRecordIds: [...sources],
    }))
    .sort(
      (a, b) =>
        rank(a.reasons) - rank(b.reasons) ||
        a.officeTitle.localeCompare(b.officeTitle) ||
        a.id.localeCompare(b.id),
    );
}
