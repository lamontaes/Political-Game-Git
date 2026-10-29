/**
 * Someone close runs the campaign (owner, Oct 26: "assembling, you know, an
 * election team"; Oct 27, 5 PM Eastern: "the political process has some kind
 * of manager... Maybe you meet someone, maybe it's your significant other or
 * your best friend"). In a drawn place the player files and plays on: while
 * nobody runs the campaign, the closest who heard weigh running it before
 * anyone offers evenings, and the first who says yes offers on the record
 * (volunteer-offered, role manager). The director stages it as its own scene
 * (manager-offer), the one who offered is on the campaign's staff, and
 * election morning reads the staff: the manager is who comes by to canvass.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { electionDay } from "../bench/election-night";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  CAMPAIGNS_MODULE_ID,
  askCircleToSign,
  campaignFor,
  type CampaignRow,
} from "../core2/modules/campaigns";
import { filingRequirements, openContests } from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("someone close offers to run the campaign, joins its staff and is cast from it", () => {
  const proof: string[] = [];
  const tried: string[] = [];
  let shown = false;
  for (let draw = 0; draw < 8 && !shown; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "campaign-manager");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
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
    director.watch(core, me);
    const api = coreAPI(core);
    // A race whose law asks no signatures first: its filing is on the ballot
    // at the counter, so election morning reads the campaign. Where every
    // race asks signatures, the candidate asks their circle each day while
    // the petition circulates, as a player does (a petition never gathered
    // left the player off the ballot: Surgoinsville, Tennessee and La
    // Alianza, Puerto Rico, seed chk2-g).
    const { stateKey } = lawChain(api);
    const filed = [...openContests(api)]
      .filter((c) => c.electionDate >= addDays(makeIsoDate(core.date), 60))
      .sort(
        (a, b) =>
          Number(filingRequirements(stateKey, a.family).petition.count > 0) -
            Number(filingRequirements(stateKey, b.family).petition.count > 0) ||
          Number(b.family === "municipalOffice") -
            Number(a.family === "municipalOffice") ||
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((c) =>
        ["petitioning", "on-ballot"].includes(
          (fileForOffice(core, me, c.id) as { filing?: { status?: string } })
            .filing?.status ?? "",
        ),
      );
    if (!filed) {
      tried.push(`${where}: no race two months out the player could enter`);
      continue;
    }
    const filingId = `filing:${filed.id}:${me}`;
    const status = () =>
      (
        api.moduleState("core2-elections-v1").table("filings").get(filingId) as
          { status?: string } | undefined
      )?.status;
    for (let day = 0; day < 120 && status() === "petitioning"; day += 1) {
      askCircleToSign(api, filingId);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }
    let offer: { id: string; helper: string } | null = null;
    const volunteersBefore: string[] = [];
    while (!offer && core.date < filed.electionDate) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), 7), filed.electionDate].sort()[0]!,
      );
      for (const row of core.logByKind.get("volunteer-offered") ?? []) {
        const record = core.durableLog.get(row as never);
        if (record?.facts?.filingId !== filingId) continue;
        if (record.facts.role === "manager")
          offer = { id: record.id, helper: String(record.facts.offeredBy) };
        else if (!offer) volunteersBefore.push(String(record.facts.offeredBy));
      }
    }
    if (!offer) {
      tried.push(
        `${where}: nobody close offered to run it before election day`,
      );
      continue;
    }
    // Running it is weighed first: anyone who offered evenings before the
    // manager's offer had already weighed running it and said no.
    const weighed = new Set(campaignFor(api, filingId).managerWeighedIds ?? []);
    for (const id of volunteersBefore)
      expect(weighed.has(id), `${where}: ${id} volunteered unweighed`).toBe(
        true,
      );
    // One record: the one who offered is on the staff, not the volunteers.
    const campaign = campaignFor(api, filingId);
    expect(campaign.staffIds, `${where}: ${offer.id}`).toContain(offer.helper);
    expect(campaign.volunteerIds, `${where}: ${offer.id}`).not.toContain(
      offer.helper,
    );
    // The director stages it as the manager's scene, never the volunteer's.
    const book = director.ledger.people.get(me)!;
    const moment = book.moments.find((m) => m.causeId === offer!.id);
    expect(moment, `${where}: ${offer.id} has a moment`).toBeTruthy();
    const entry = book.schedule.find((e) => e.momentId === moment!.id);
    const types = (entry?.bindings ?? []).map((b) => b.typeKey);
    expect(types, `${where}: ${offer.id}`).not.toContain("volunteer-offer");
    // Election morning reads the staff: the manager comes by to canvass,
    // when the player is on the ballot and the manager lives in town.
    const offeredOn = core.date;
    advanceCore(core, addDays(makeIsoDate(filed.electionDate), -1));
    const morning = electionDay(core, me, null, false, filed.electionDate);
    const helper = core.people.get(offer.helper as PersonId);
    const staffed = campaignFor(api, filingId).staffIds.includes(offer.helper);
    if (
      morning.canvass &&
      staffed &&
      helper?.alive &&
      helper.placeId === core.people.get(me)!.placeId
    )
      expect(morning.canvass.helperId, `${where}: ${offer.id}`).toBe(
        offer.helper,
      );
    const tie = core.people.get(me)!.familyIds.has(offer.helper as PersonId)
      ? "family"
      : "friend";
    // How many of the town's campaigns, the rivals' too, have someone running them.
    const all = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .rows() as unknown as CampaignRow[];
    const run = all.filter((row) => row.staffIds.length).length;
    const line = `${where}: ${offer.id} (${tie}) on ${offeredOn}; staged as ${types.join(", ") || "a journal line"}; election morning ${morning.canvass ? `canvasser ${morning.canvass.helperId ?? "none"}` : "not on the ballot"}; ${run} of ${all.length} campaigns have a manager`;
    // Shown once election morning has read the staff in a played world.
    if (morning.canvass?.helperId === offer.helper) {
      proof.push(line);
      shown = true;
    } else tried.push(line);
  }
  writeFileSync(
    path.join(tmpdir(), "campaign-manager-proof.txt"),
    `${[...proof, ...tried].join("\n")}\n`,
  );
  expect(shown, tried.join("\n")).toBe(true);
}, 1_200_000);
