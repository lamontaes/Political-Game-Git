import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { settleEstate, heirsOf } from "../core2/estates";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";

// A person who learns that a law took money from them has a moment the
// director schedules from the learned-effect record (owner, Oct 15: scenes
// fire from recorded causes). The owner ruled on Oct 16 that the news and
// social media tell a person a law changed their money, not a friend and not
// an outlet's head, so the scene has no teller: the reached person brings
// what they read to a member of their household, and a person who lives
// alone has the moment and no scene (the household role is left unbound by
// the record, not invented). An heir told by an estate's accounting has the
// same moment.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`an heir who learns a law took money has the moment, and a scene only with a household member (seed ${seed})`, () => {
  const place = drawPlace(seed, "law-reached-scenes");
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name}, seed ${seed}`;
  const housemates = (id: string, not: string) =>
    [
      ...(core.households.get(core.people.get(id)!.householdId)?.memberIds ??
        []),
    ]
      .filter((other) => other !== id && other !== not)
      .filter((other) => core.people.get(other)?.alive);
  const candidates = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        heirsOf(api, p).heirs.length &&
        !core.finance.incomeContractsByPerson.get(p.id)?.size,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // The first estate with an heir who lives with someone else (so the scene
  // can bind a listener); failing that, the first estate at all.
  const decedent =
    candidates.find((p) =>
      heirsOf(api, p).heirs.some((heir) => housemates(heir, p.id).length),
    ) ?? candidates[0];
  const expectScene = candidates.some(
    (p) =>
      p === decedent &&
      heirsOf(api, p).heirs.some((heir) => housemates(heir, p.id).length),
  );
  expect(decedent, `${where}: no one with living kin`).toBeDefined();
  for (const heir of heirsOf(api, decedent!).heirs) director.watch(core, heir);
  // An estate of $20 million, so the estate tax in force applies (an edge
  // case a played town rarely holds).
  api.updatePerson(decedent!.id, { liquidMinor: 20_000_000_00 });
  api.updatePerson(decedent!.id, { alive: false });
  settleEstate(api, decedent!.id, "event:death");
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), api.parameter("probateDays") + 1),
  );
  let moments = 0;
  let scenes = 0;
  for (const [personId, book] of director.ledger.people)
    for (const row of book.schedule) {
      const moment = book.momentsById.get(row.momentId);
      if (moment?.label !== "cause:event:law.effect-learned") continue;
      const here = `${where}, ${personId}, ${moment.causeId}`;
      const others = [
        ...(core.households.get(core.people.get(personId)!.householdId)
          ?.memberIds ?? []),
      ].filter((id) => id !== personId && core.people.get(id)?.alive);
      if (others.length) {
        const bound = row.bindings[0];
        expect(
          bound?.roles.map((r) => r.role),
          here,
        ).toEqual(["reached", "listener"]);
        expect(others, here).toContain(
          bound!.roles.find((r) => r.role === "listener")!.personIds[0],
        );
        scenes += 1;
      } else {
        expect(row.bindings, here).toEqual([]);
        expect(row.coverage?.reason, here).toBe("role-unbound");
        expect(row.coverage?.detail, here).toContain("listener");
      }
      moments += 1;
    }
  expect(
    moments,
    `${where}: an heir's learned effect is a moment`,
  ).toBeGreaterThan(0);
  // An heir who lives with someone has a scene with them, by the household's
  // own record, not only the moment.
  if (expectScene)
    expect(
      scenes,
      `${where}: an heir with a housemate has a scene`,
    ).toBeGreaterThan(0);
}, 3_600_000);
