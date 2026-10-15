import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import { candidacyReasons } from "./modules/candidacy";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { incompatibleOffices } from "./office-incompatibility";
import {
  outletsHere,
  requestInterview,
  newsworthiness,
  officeholderSpeaker,
  pressParameter,
} from "./modules/press";
import { wireItem } from "./press-topics";
import { lawChain } from "./modules/laws";
import { winningPersonId } from "./modules/voting";
import { drawPlace } from "../../scripts/core2-year/place";

it("resolves term aliases without rewriting real official person ids", () => {
  const seed = process.env.OFFICE_RECORD_SEED ?? randomBytes(8).toString("hex");
  const place = drawPlace(seed, "office-records");
  console.log({ seed, place });
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const president = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
  )[0]!.personId!;
  expect(
    newsworthiness(api, officeholderSpeaker(api, president)!),
  ).toBeGreaterThan(pressParameter("nationalInterviewBar"));
  const national = outletsHere(api).find((o) => o.tier === "national")!;
  expect(
    requestInterview(api, { outletId: national.id, personId: president })
      .reason,
  ).not.toBe("not-newsworthy");
  const chain = lawChain(api);
  expect(
    wireItem(
      api,
      {
        id: "fixture:president-public-act",
        date: core.date,
        kind: "executive-action",
        personIds: [president],
        placeId: chain.townPlaceId,
        publicRecord: true,
        source: { tag: "SOURCED", citation: "edge fixture", asOf: core.date },
      },
      { placeId: chain.townPlaceId, stateKey: chain.stateKey },
    )?.level,
  ).toBe("nation");
  const seats = townSeats(api);
  const house = seats.find((s) => s.office.kind === "us-house");
  const local = seats.find(
    (s) =>
      s.office.level === "city" ||
      s.office.level === "county" ||
      s.office.level === "township",
  );
  if (house && local) {
    const holder = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          house.seat.id,
          "serving",
        ]) as unknown as TermRow[]
    )[0]!;
    const race = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find((c) => c.seatId === local.seat.id)!;
    const reasons = candidacyReasons(api, core.people.get(holder.personId!)!, {
      contestId: race.id,
      officeName: race.title,
      filingDeadline: race.filingDeadline,
      sourceIds: [race.id],
    });
    expect(reasons.officeOpportunity).toBeLessThan(0);
    expect(
      incompatibleOffices(house.office, local.office, place.state),
    ).not.toBeNull();
    expect(
      incompatibleOffices(house.office, house.office, place.state),
    ).toBeNull();
  }
  for (const { seat } of townSeats(api)) {
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[];
    for (const term of terms) {
      const resolved = winningPersonId(api, `official:${term.id}`);
      expect(core.people.has(resolved)).toBe(true);
      expect(winningPersonId(api, resolved)).toBe(resolved);
      if (term.personId) expect(resolved).toBe(term.personId);
    }
  }
}, 120_000);
