import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { moduleState } from "./module-state";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { closenessBetween } from "./closeness";
import { meetInTalk } from "./encounters";
import { partnerAgeLikelihood } from "./opening-partnership";
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
  const free = pool.filter((row) => row !== taken && row !== theirs);
  return { core, api, me, singles: singlesKnown(), free, taken, where };
}

describe("the player's own courtship acts (Pulaski, Ohio)", () => {
  it("asks out: someone with a partner says no and the ask stays closed; the answer is a record", () => {
    const { core, api, me, taken, where } = world();
    const out = askOut(api, me, taken!.id);
    expect(out, where).toMatchObject({
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
  }, 50_000);

  it("asks out someone the player has spent time with: a yes starts them dating, then a proposal is answered", () => {
    const { core, api, me, free, where } = world();
    const player = core.people.get(me)!;
    const today = makeIsoDate(core.date);
    const ageOf = (born: string) => ageOnDate(makeIsoDate(born), today);
    const gender = (row: { looks?: { gender?: string } }) =>
      row.looks?.gender === "female" || row.looks?.gender === "male"
        ? row.looks.gender
        : undefined;
    // The single in town whose age fits the player best, as they would weigh
    // the player (the engine's own age fit); who that is moves with the
    // world's draw, so it is found, not named. If the two have not met, they
    // meet the way a talk meets them (the encounters engine's writer). First
    // asked cold, then after twenty evenings spent together (the visits the
    // card's Visit act writes, as the closeness engine's own "visit"
    // contact). Twenty evenings outweigh the cold no.
    //
    // The premise before (to Nov 15): the single the player already knew
    // nearest their age (Samantha, born 2001, for a player born 2007) said no
    // for the age gap cold and yes after twenty evenings. The Train's later
    // changes moved the draw: at 18 the player now knows five singles, born
    // 1958, 1960, 1966, 1977 and 1993, and the nearest (born 1993) fits him at
    // 121 against 4,317 for her best other single, so no time together turns
    // it. The engine's rule is unchanged; who is asked is now found by fit
    // (Account lead's yes, Nov 15).
    const fitFor = (row: (typeof free)[number]) =>
      partnerAgeLikelihood(
        ageOf(row.birthDate),
        gender(row),
        ageOf(player.birthDate),
        gender(player),
      );
    const other = [...free].sort(
      (a, b) => fitFor(b) - fitFor(a) || a.id.localeCompare(b.id),
    )[0]!;
    meetInTalk(
      api,
      me,
      other.id,
      player.placeId,
      1,
      `talk:${core.date}:${me}:${other.id}`,
    );
    const cold = askOut(api, me, other.id);
    const answers = [`cold: ${cold.answer} ${cold.reason ?? ""}`];
    // Both halves are the proof: a cold ask is refused, and the same person
    // says yes after time together. Asked cold, the best-fitting single knows
    // another single who fits as well and is closer: the no is barely-know.
    expect(
      [cold.answer, cold.reason],
      `${where}: ${other.givenName} cold`,
    ).toEqual(["no", "barely-know"]);
    // The age gap: the single whose age fits the player least (but at all),
    // met the same way and asked cold, says no for the age gap.
    const far = [...free]
      .filter((row) => row !== other && fitFor(row) > 0)
      .sort((a, b) => fitFor(a) - fitFor(b) || a.id.localeCompare(b.id))[0]!;
    meetInTalk(
      api,
      me,
      far.id,
      player.placeId,
      1,
      `talk:${core.date}:${me}:${far.id}`,
    );
    const gap = askOut(api, me, far.id);
    expect(
      [gap.answer, gap.reason],
      `${where}: ${far.givenName} (born ${far.birthDate}) cold`,
    ).toEqual(["no", "age-gap"]);
    {
      expect(canAsk(api, me, other.id, "ask-out"), where).toEqual({
        open: false,
        reason: "nothing-changed",
      });
      // Another day: an answer given today stands for the day.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
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
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
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
    else expect(["too-soon", "not-sure-yet"], where).toContain(asked.reason);
  }, 50_000);
});
