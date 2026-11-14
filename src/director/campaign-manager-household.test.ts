/**
 * The household's offer to run the campaign is staged (pool item
 * campaign-manager-offer-never-stages). The campaigns engine weighs the
 * player's own household first, nearest first, for who runs the campaign, so
 * the one who offers is most often a partner or a relative at home. The
 * manager-offer scene once refused anyone who lives with the player (receive
 * rule "apart"), so the offer went to the Journal while the helper was put on
 * the campaign's staff and later called "your campaign manager" on election
 * night. Pinned to one place and one world seed where the offer comes from a
 * household member, so the case is the same on every run.
 *
 * Place: Stony Creek, Virginia (5175840), world seed below, the city council
 * race of 2025-11-04 (filing opens 2025-04-21). Found by the campaign-events
 * script, seed q4 town.
 */
import { expect, it } from "vitest";
import { applyChosenPerson } from "../bench/creator";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { campaignFor } from "../core2/modules/campaigns";
import { coreAPI } from "../core2/state";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { PersonId } from "../core2/types";

const STONY_CREEK = {
  name: "Stony Creek, Virginia",
  place: "5175840",
  seed: "8f24b411dde6c73638211e2756d6f3899707979906e0ceff6fd58e6e4144ef03",
  contest: "contest:seat:gus2025:136051:council:0:2025-11-04",
  opens: "2025-04-21",
  answer: "agree" as const,
};
// The county board race there is not at the top of the day's impact, so the
// type itself stops the day (stopsDay) where the offer's weight would not.
const PATRICK_AFB = {
  name: "Patrick AFB, Florida",
  place: "1255375",
  seed: "8cace34a6d31334e7f59ce6072715a15fc4635c6c9a9b2d6da606338769b2332",
  contest: "contest:seat:gus2025:161546:board:2:2026-11-03",
  opens: "2026-02-23",
  answer: "decline" as const,
};

function offerAtHomeStopsTheDay(c: {
  name: string;
  place: string;
  seed: string;
  contest: string;
  opens: string;
  answer: "agree" | "decline";
}) {
  const where = `${c.name} (${c.place}), world seed ${c.seed}, ${c.contest}`;
  setBookkeeping(false);
  const world = buildBenchWorld(c.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: c.place,
  });
  const { core, director } = world;
  const me = world.playerId! as PersonId;
  applyChosenPerson(core, me, {
    givenName: "Pat",
    familyName: core.people.get(me)!.familyName,
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const home = core.households.get(core.people.get(me)!.householdId)!;
  for (const id of home.memberIds)
    if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
  const api = coreAPI(core);
  while (core.date < c.opens)
    advanceCore(core, [addDays(makeIsoDate(core.date), 7), c.opens].sort()[0]!);
  const filed = fileForOffice(core, me, c.contest) as {
    filing?: { id?: string };
  };
  const filingId = filed.filing?.id ?? `filing:${c.contest}:${me}`;
  gatherSignatures(core, filingId);
  const afterPetition = core.date;
  advanceCore(core, addDays(makeIsoDate(afterPetition), 90));

  const offers = [...(core.logByKind.get("volunteer-offered") ?? [])]
    .map((id) => core.durableLog.get(id as never)!)
    .filter(
      (row) => row.facts?.filingId === filingId && row.facts.role === "manager",
    );
  expect(
    offers.length,
    `${where}: nobody offered to run it by ${core.date} (petition done ${afterPetition})`,
  ).toBe(1);
  const offer = offers[0]!;
  const helper = String(offer.facts!.offeredBy);
  expect(
    home.memberIds.includes(helper as never),
    `${where}: ${offer.id} came from ${helper}, who lives apart`,
  ).toBe(true);
  // Nothing is decided for the player: the helper runs the campaign only on
  // the player's yes in the scene.
  expect(
    campaignFor(api, filingId).staffIds,
    `${where}: ${helper} was staffed before the player answered`,
  ).not.toContain(helper);

  const book = director.ledger.people.get(me)!;
  const moment = book.moments.find((m) => m.causeId === offer.id);
  expect(moment, `${where}: ${offer.id} has no moment`).toBeTruthy();
  const entry = book.schedule.find((e) => e.momentId === moment!.id);
  expect(
    entry?.bindings.map((b) => b.typeKey),
    `${where}: ${offer.id} outcome ${entry?.outcome}`,
  ).toEqual(["manager-offer"]);
  expect(entry!.outcome).toBe("scene-now");
  expect(
    entry!.bindings[0]!.roles.find((r) => r.role === "helper")!.personIds,
  ).toEqual([helper]);
  expect(entry!.bindings[0]!.setting.kind).toBe("home");

  const res = purposeScene(core, director, me, entry!, {
    typeKey: "manager-offer",
  });
  expect(res?.kind, where).toBe("composed");
  const tree = (
    res as {
      scene: { talk: { tree: { replies: { line: { move: string } }[] } } };
    }
  ).scene.talk.tree;
  expect(
    tree.replies.map((r) => r.line.move).sort(),
    `${where}: the replies`,
  ).toEqual(["agree", "ask", "decline"]);
  const pick = tree.replies.findIndex((r) => r.line.move === c.answer);
  expect(
    replyInScene(core, director, me, entry!, [pick], {
      typeKey: "manager-offer",
    }),
    where,
  ).toBeTruthy();
  const staff = campaignFor(api, filingId).staffIds;
  if (c.answer === "agree") expect(staff, where).toContain(helper);
  else expect(staff, where).not.toContain(helper);
}

it(
  "Stony Creek, Virginia: an offer from someone at home stops the day as its own scene",
  () => offerAtHomeStopsTheDay(STONY_CREEK),
  240_000,
);

it(
  "Patrick AFB, Florida: the same for a county race",
  () => offerAtHomeStopsTheDay(PATRICK_AFB),
  240_000,
);
