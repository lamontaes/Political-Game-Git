/**
 * The campaign board's team area reads the campaign's own record (pool item
 * screens-campaign-board): the one who offered to run it is on the staff, the
 * volunteers are listed apart, each by name. A place drawn from all 56;
 * GOLDEN_PATH_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { campaignView } from "./campaign";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "./creator";
import { fileForOffice } from "./government";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { askCircleToSign, campaignFor } from "../core2/modules/campaigns";
import {
  filingRequirements,
  openContests,
  playerMayFileFor,
} from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it(`the campaign board's team lists the manager and the volunteers from the campaign record (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 16; draw += 1) {
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
      // The six offices the player may run for (owner, Oct 29).
      .filter(
        (c) =>
          c.electionDate >= addDays(makeIsoDate(core.date), 60) &&
          playerMayFileFor(api, c.id),
      )
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
    const campaign = campaignFor(api, filingId);
    const view = campaignView(core, me).campaigns.find(
      (row) => row.filing.id === filingId,
    );
    expect(
      view,
      `${where}: ${filingId} is not on the campaign view`,
    ).toBeTruthy();
    const named = (id: string) =>
      `${core.people.get(id as PersonId)!.givenName} ${core.people.get(id as PersonId)!.familyName}`;
    // The manager is on the staff and not among the volunteers; every name is the person's own.
    expect(
      view!.team.staff.map((p) => p.id),
      `${where}: ${offer.id}`,
    ).toContain(offer.helper);
    expect(
      view!.team.volunteers.map((p) => p.id),
      `${where}: ${offer.id}`,
    ).not.toContain(offer.helper);
    for (const p of [...view!.team.staff, ...view!.team.volunteers])
      expect(p.name, `${where}: ${p.id}`).toBe(named(p.id));
    // The board's money panel counts the same volunteers the team list shows.
    expect(view!.campaign.volunteers, where).toBe(view!.team.volunteers.length);
    // One source: the lists are the campaign row's, nothing kept on the screen's side.
    expect(view!.team.staff.length + view!.team.volunteers.length, where).toBe(
      new Set([...campaign.staffIds, ...campaign.volunteerIds]).size,
    );
    return;
  }
  throw new Error(`no place offered a manager: ${tried.join("; ")}`);
}, 900_000);
