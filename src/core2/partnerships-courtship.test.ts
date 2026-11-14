import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { moduleState } from "./module-state";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { closenessBetween } from "./closeness";
import {
  askOut,
  canAsk,
  FAMILY_ASKED_OUT,
  propose,
} from "./modules/partnerships";
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";

// The player asks someone out and later proposes; the other answers from
// their own record (family life question 1, ruled Nov 14 2026 under the
// owner's overnight say). A no is kept with its reason and date, and the same
// ask stays closed until that reason no longer holds. Place and seed pinned:
// Pulaski, Ohio, family-a.
setBookkeeping(false);

const adult = (core: CoreState, born: string) =>
  ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;

function world() {
  const place = drawPlace("family-a", "family-life");
  const where = `${place.name} (${place.key}), seed family-a`;
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = built.core;
  const me = built.playerId! as PersonId;
  while (!adult(core, core.people.get(me)!.birthDate))
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const api = coreAPI(core);
  const partnered = new Set<string>();
  for (const link of core.familyLinks.values())
    if (link.kind === "partner")
      for (const id of link.personIds) partnered.add(id);
  const player = core.people.get(me)!;
  const partnerOf = (id: string) =>
    [...core.familyLinks.values()].some(
      (link) =>
        link.kind === "partner" && link.personIds.includes(id as PersonId),
    );
  // Singles in town the player knows, closest first.
  const singlesKnown = () =>
    [...player.knownIds]
      .map((id) => core.people.get(id)!)
      .filter(
        (row) =>
          row?.alive &&
          row.tier !== "husk" &&
          row.placeId === player.placeId &&
          row.householdId !== player.householdId &&
          !player.familyIds.has(row.id) &&
          !partnered.has(row.id) &&
          !partnerOf(row.id) &&
          adult(core, row.birthDate),
      )
      .sort(
        (a, b) =>
          closenessBetween(core, me, b.id) - closenessBetween(core, me, a.id) ||
          a.id.localeCompare(b.id),
      );
  // Someone in town who is seeing someone: two singles the engine's own
  // writer pairs, the way its monthly review does.
  const pool = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        row.placeId === player.placeId &&
        row.householdId !== player.householdId &&
        !partnered.has(row.id) &&
        !player.familyIds.has(row.id) &&
        adult(core, row.birthDate),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const taken = pool.at(-1)!;
  const theirs = pool.at(-2)!;
  api.setPartnersV1({
    personIds: [taken.id, theirs.id],
    together: true,
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation: "The partnerships writer, as its monthly review calls it.",
    },
    facts: { union: "dating" },
  });
  return { core, api, me, singles: singlesKnown(), taken, where };
}

describe("the player's own courtship acts (Pulaski, Ohio)", () => {
  it("asks out: someone with a partner says no and the ask stays closed; the answer is a record", () => {
    const { core, api, me, taken, where } = world();
    const out = askOut(api, me, taken!.id);
    expect(out, where).toEqual({
      asked: true,
      answer: "no",
      reason: "with-someone",
    });
    expect(canAsk(api, me, taken!.id, "ask-out"), where).toEqual({
      open: false,
      reason: "nothing-changed",
    });
    const record = [...core.durableLog.values()].find(
      (row) => row.kind === FAMILY_ASKED_OUT,
    );
    expect(record?.personIds, where).toEqual([taken!.id, me]);
    expect(record?.facts?.reason, where).toBe("with-someone");
  }, 120_000);

  it("asks out someone the player has spent time with: a yes starts them dating, then a proposal is answered", () => {
    const { core, api, me, singles, where } = world();
    const born = core.people.get(me)!.birthDate;
    // The single nearest the player's age; first asked cold, then after
    // evenings spent together (the visits the card's Visit act writes, as
    // the closeness engine's own "visit" contact).
    const other = [...singles].sort(
      (a, b) =>
        Math.abs(Date.parse(a.birthDate) - Date.parse(born)) -
          Math.abs(Date.parse(b.birthDate) - Date.parse(born)) ||
        a.id.localeCompare(b.id),
    )[0]!;
    const cold = askOut(api, me, other.id);
    const answers = [`cold: ${cold.answer} ${cold.reason ?? ""}`];
    if (cold.answer === "no") {
      expect(canAsk(api, me, other.id, "ask-out"), where).toEqual({
        open: false,
        reason: "nothing-changed",
      });
      const kind = core.relationships.get(
        me < other.id ? `${me}:${other.id}` : `${other.id}:${me}`,
      )?.kind;
      for (let evening = 0; evening < 20; evening += 1) {
        api.relationship(
          me,
          other.id,
          kind ?? ("friend" as never),
          3,
          undefined,
          {
            cause: "visit",
          },
        );
        if (canAsk(api, me, other.id, "ask-out").open) break;
      }
      const warm = askOut(api, me, other.id);
      answers.push(`after time together: ${warm.answer} ${warm.reason ?? ""}`);
    }
    const link = [...core.familyLinks.values()].find(
      (row) => row.kind === "partner" && row.personIds.includes(me),
    );
    expect(
      link?.personIds,
      `${where}: ${other.givenName} says yes (${answers.join("; ")})`,
    ).toContain(other.id);
    const partner = other.id;
    const couples = moduleState(core, "partnerships").table("couples");
    expect((couples.get(link!.id) as { stage: string }).stage, where).toBe(
      "dating",
    );
    // Asking out again is closed while together; a proposal on day one is
    // too soon; once the couple has lived together a while, it is answered
    // from how far they have come.
    expect(canAsk(api, me, partner, "ask-out").reason, where).toBe(
      "you-are-with-someone",
    );
    expect(propose(api, me, partner), where).toMatchObject({
      asked: true,
      answer: "no",
      reason: "too-soon",
    });
    expect(canAsk(api, me, partner, "propose").open, where).toBe(false);
    couples.put({
      id: link!.id,
      stage: "living-together",
      since: core.date,
      progress: 0.9,
    } as never);
    const asked = propose(api, me, partner);
    expect(asked.asked, where).toBe(true);
    if (asked.answer === "yes")
      expect((couples.get(link!.id) as { stage: string }).stage, where).toBe(
        "engaged",
      );
    else expect(asked.reason, where).toBe("too-soon");
  }, 120_000);
});
