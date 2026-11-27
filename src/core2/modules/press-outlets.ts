import type { CoreAPI } from "../types";
import type { ModuleRow } from "../module-data";
import type { EntityId } from "../kernel/brands";
import type { OutletKind } from "./press-base";
import {
  ALL_KINDS,
  ageOn,
  followCache,
  leanOf,
  outletsHere,
  table,
} from "./press-base";

/**
 * How an outlet of each kind carries the news: printed on paper, shown on a
 * screen, or said on the air; a site online is none of the three. Talk says
 * "I read in" a paper, "I saw on" a station, "I heard on" the radio.
 */
const MEDIA: Readonly<
  Partial<Record<OutletKind, "paper" | "television" | "radio">>
> = {
  newspaper: "paper",
  "national-paper": "paper",
  magazine: "paper",
  television: "television",
  cable: "television",
  radio: "radio",
};

/** How an outlet's kind carries the news, or null for one online. */
export function outletMedium(
  kind: OutletKind,
): "paper" | "television" | "radio" | null {
  return MEDIA[kind] ?? null;
}

/**
 * How a person says an outlet: what it is (a paper is read in, a television or
 * online outlet is seen on, a radio station is heard on) and whether its name
 * takes "the" ("the Wendell Gazette"; a station's call letters and a name that
 * already opens with "The" do not). Read from the outlet's record, so every
 * line that names an outlet can say it the same way.
 */
export function outletTelling(
  api: CoreAPI,
  organizationId: string,
  name: string,
):
  | {
      readonly medium: "paper" | "television" | "radio" | "online";
      readonly the: boolean;
    }
  | undefined {
  const row = outletsHere(api).find((o) => o.organizationId === organizationId);
  if (!row) return undefined;
  const medium = outletMedium(row.kind) ?? "online";
  return { medium, the: medium === "paper" && !/^the\s/i.test(name) };
}

/**
 * How many of a place's own local newspapers have closed: the outlets of kind
 * newspaper recorded for it whose business book in the finance ledger carries
 * a closing date (the owner's choice to close it, or a forced closure), and
 * the outlet that closed first as the record the count stands on. Zero while
 * they all publish. Null where the press keeps no local outlet for the place
 * (no press installed, or a place whose outlets the world does not model), so
 * a place with no record is not read as one with no closures. The outcome web
 * reads this as `press.local-newspaper`.
 */
export function closedNewspapers(
  api: CoreAPI,
  placeId: string,
): { count: number; recordId: string | null } | null {
  const local = outletsHere(api).filter(
    (o) => o.tier !== "national" && o.placeId === placeId,
  );
  if (!local.length) return null;
  const closed = local
    .filter(
      (o) =>
        o.kind === "newspaper" &&
        api.state.finance.businesses.get(o.organizationId)?.closedAt,
    )
    .sort(
      (a, b) =>
        api.state.finance.businesses
          .get(a.organizationId)!
          .closedAt!.localeCompare(
            api.state.finance.businesses.get(b.organizationId)!.closedAt!,
          ) || a.id.localeCompare(b.id),
    );
  return { count: closed.length, recordId: closed[0]?.id ?? null };
}

/**
 * A person follows an outlet, or stops: their choice stands over the week's
 * audiences until they change it. Settles at once, not at the next week.
 */
export function setFollow(
  api: CoreAPI,
  personId: string,
  outletId: string,
  follows: boolean,
): void {
  table(api, "follows").put({
    id: `${personId}:${outletId}`,
    personId,
    outletId,
    follows,
    since: api.state.date,
  } as unknown as ModuleRow);
  followCache.delete(api.state);
}

/**
 * A household knows its paper and its station from day one: each adult in it
 * follows, of each kind of local outlet the town has, the one nearest their own
 * lean (the same selective exposure `followersOf` gives the audiences), so the
 * household is never one that has no outlet to read. Opening stock: the
 * engine's own pick, kept as the person's own follow.
 */
export function openHouseholdOutlets(api: CoreAPI, householdId: string): void {
  const household = api.state.households.get(householdId as EntityId);
  if (!household) return;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const local = outletsHere(api).filter((o) => o.tier === "local");
  for (const id of household.memberIds) {
    const p = api.state.people.get(id);
    if (!p?.alive || ageOn(p, date) < adultAge) continue;
    const lean = leanOf(api, id);
    for (const kind of ALL_KINDS) {
      const own = local.filter((o) => o.kind === kind);
      if (!own.length) continue;
      const nearest = own.reduce((best, o) =>
        Math.abs((o.lean ?? 0) - lean) < Math.abs((best.lean ?? 0) - lean)
          ? o
          : best,
      );
      if (!table(api, "follows").get(`${id}:${nearest.id}`))
        setFollow(api, id, nearest.id, true);
    }
  }
}
