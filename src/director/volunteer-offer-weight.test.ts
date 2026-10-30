/**
 * Volunteers do not stop the player one by one (owner, Oct 27, 4 PM Eastern:
 * "it shouldn't be stopped for literally every single volunteer. Maybe some
 * that matter. And that's only when you're doing small local campaigns, or
 * maybe your first campaign. If you're running a presidency campaign and you
 * stop for every little volunteer, like, what are we doing?"). In a drawn
 * place the player files for a race and plays to election day. Every offer of
 * help puts the helper on the one campaign record the header, the Volunteers
 * row and the director read; the director sizes each offer's moment by its
 * weight, which falls with the race's size and rises with the tie, and only
 * an offer whose moment reaches the interrupt line stops the day.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { campaignAct, campaignView } from "../bench/campaign";
import { applyChosenPerson } from "../bench/creator";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { campaignFor, offerWeight } from "../core2/modules/campaigns";
import {
  openContests,
  playerMayFileFor,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import directorJson from "./data/director.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const proof: string[] = [];
const params = directorJson.parameters as Record<string, { value: number }>;

it("an offer of help joins the one campaign record and stops the player only by its weight", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "volunteer-offer-weight");
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
    // The six offices the player may run for (owner, Oct 29).
    const contests = [...openContests(api)].filter(
      (c) =>
        c.electionDate >= addDays(makeIsoDate(core.date), 60) &&
        playerMayFileFor(api, c.id),
    );
    // The smallest race the player can enter: the town's own, where one is open.
    const filed = contests
      .sort(
        (a, b) =>
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
    const filing = api
      .moduleState("core2-elections-v1")
      .table("filings")
      .get(filingId) as unknown as FilingRow;

    // The same helper weighs less in a bigger race: the weight slides with
    // the race's eligible voters, by the one rule for every place.
    const statewide =
      filed.family === "statewideExecutive"
        ? undefined
        : (contests.find((c) => c.family === "statewideExecutive") as
            ContestRow | undefined);
    const someone = [...core.people.get(me)!.knownIds].sort()[0]!;
    const local = offerWeight(api, filing, filed, someone);
    if (statewide) {
      const wide = offerWeight(api, filing, statewide, someone);
      // Never more: a territory-wide race and an at-large seat can share one
      // electorate (American Samoa), and then the two weigh the same.
      expect(
        wide,
        `${where}: ${statewide.id} vs ${filed.id}`,
      ).toBeLessThanOrEqual(local);
      // At a statewide race's size a stranger's offer stays under the line.
      expect(
        params.directorVolunteerOfferImpact!.value * wide,
        `${where}: ${statewide.id}`,
      ).toBeLessThan(params.directorInterruptImpact!.value);
    }

    const offers: string[] = [];
    while (core.date < filed.electionDate) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), 7), filed.electionDate].sort()[0]!,
      );
      const book = director.ledger.people.get(me)!;
      for (const row of core.durableLog.values()) {
        if (
          row.kind !== "volunteer-offered" ||
          row.facts?.filingId !== filingId ||
          offers.includes(row.id)
        )
          continue;
        offers.push(row.id);
        const helper = String(row.facts.offeredBy);
        // One record: the helper is on the campaign the header reads, on its
        // staff when the offer was to run it.
        const campaign = campaignFor(api, filingId);
        expect(
          row.facts.role === "manager"
            ? campaign.staffIds
            : campaign.volunteerIds,
          `${where}: ${row.id} (${row.facts.role})`,
        ).toContain(helper);
        // The director's moment is the offer's weight times the impact.
        const moment = book.moments.find((m) => m.causeId === row.id);
        expect(moment, `${where}: ${row.id} has a moment`).toBeTruthy();
        const weight = Number(row.facts.weight);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
        expect(moment!.impact, `${where}: ${row.id}`).toBeCloseTo(
          params.directorVolunteerOfferImpact!.value * weight,
          6,
        );
        const entry = book.schedule.find((e) => e.momentId === moment!.id);
        if (
          entry?.interrupt &&
          entry.bindings.every((b) =>
            ["volunteer-offer", "manager-offer"].includes(b.typeKey),
          )
        )
          expect(
            moment!.impact,
            `${where}: ${row.id} stops only past the line`,
          ).toBeGreaterThanOrEqual(params.directorInterruptImpact!.value);
        proof.push(
          `${where}: ${row.id} weight ${weight.toFixed(3)} impact ${moment!.impact.toFixed(3)} ${entry?.outcome}`,
        );
      }
      if (offers.length >= 3) break;
    }
    if (!offers.length) {
      tried.push(`${where}: no offer of help before election day`);
      continue;
    }
    // The header and the Volunteers row read the same record.
    const asked = campaignAct(core, me, { filingId, kind: "volunteer" }) as {
      volunteers: number;
    };
    const header = campaignView(core, me).campaigns.find(
      (row) => row.filing.id === filingId,
    );
    expect(asked.volunteers, where).toBe(
      campaignFor(api, filingId).volunteerIds.length,
    );
    expect(header?.campaign.volunteers, where).toBe(asked.volunteers);
    proof.push(
      `${where}: ${offers.length} offers, ${asked.volunteers} on the campaign`,
    );
    // The proof, by place, seed and record id (the runner keeps no console).
    writeFileSync(
      path.join(tmpdir(), "volunteer-offer-proof.txt"),
      `${proof.join("\n")}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place gave an offer of help:\n${tried.join("\n")}\n${proof.join("\n")}`,
  );
}, 900_000);
