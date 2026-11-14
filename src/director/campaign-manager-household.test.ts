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
import type { PersonId } from "../core2/types";

const PLACE = "5175840";
const WORLD_SEED =
  "8f24b411dde6c73638211e2756d6f3899707979906e0ceff6fd58e6e4144ef03";
const CONTEST = "contest:seat:gus2025:136051:council:0:2025-11-04";
const where = `Stony Creek, Virginia (${PLACE}), world seed ${WORLD_SEED}, ${CONTEST}`;

it("an offer to run the campaign from someone at home stops the day as its own scene", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(WORLD_SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
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
  while (core.date < "2025-04-21")
    advanceCore(
      core,
      [addDays(makeIsoDate(core.date), 7), "2025-04-21"].sort()[0]!,
    );
  const filed = fileForOffice(core, me, CONTEST) as {
    filing?: { id?: string };
  };
  const filingId = filed.filing?.id ?? `filing:${CONTEST}:${me}`;
  gatherSignatures(core, filingId);
  const afterPetition = core.date;
  advanceCore(
    core,
    afterPetition > "2025-06-15" ? afterPetition : "2025-06-15",
  );

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
  expect(campaignFor(api, filingId).staffIds).toContain(helper);

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
}, 240_000);
