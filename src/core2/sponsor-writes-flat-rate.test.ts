import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { billCatalog, provisionFor } from "./bill-catalog";
import { LAWS_MODULE_ID } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { draftBill, holdEveryChamber } from "./modules/legislature";
import { flatRateOf } from "./law-reach/group-b-money";
import {
  reachParameter,
  reachParameterSpread,
} from "./law-reach/group-b-people";
import type { LawRowInput } from "./laws-starting";

// A sponsor writes the flat rate: the bill records the sponsor's own stance on
// the question it enacts, and the repeal of a graduated tax reads it, sliding
// between the shallowest and deepest cut real conversions chose.
it(
  "an enacted policy section records its sponsor's stance, and the flat rate slides with it (place 1817074, seed sponsor-rate-1)",
  {
    timeout: 240_000,
  },
  () => {
    const { core } = buildBenchWorld("sponsor-rate-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "1817074",
    });
    const api = coreAPI(core);
    const seat = townSeats(api).find(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    expect(seat, "a seated council").toBeDefined();
    const question = billCatalog(api, "city")
      .flatMap((m) => m.topics.flatMap((t) => t.policies))
      .find((p) => p.kind === "policy-question" && p.authority.allowed);
    expect(question, "a policy question the council may answer").toBeDefined();
    const bill = draftBill(api, {
      bodyOfficeId: seat!.office.id,
      sponsorId: seat!.holder!.personId!,
      provisions: [
        provisionFor({ policyId: question!.id, operation: "enact" }),
      ],
    });
    expect(bill.status).toBe("drafted");
    const held = holdEveryChamber(api, bill.id);
    const row = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[]
    ).find((r) => r.terms?.enactedByBill === bill.id);
    expect(
      row,
      `the bill (${held.status}) wrote a law row for its section`,
    ).toBeDefined();
    const stance = row!.terms?.sponsorStance;
    expect(typeof stance).toBe("number");
    expect(Math.abs(stance as number)).toBeLessThanOrEqual(1);

    // The rate slides with the sponsor's conviction, inside the real band.
    const median = reachParameter("graduatedRepealFlatShareOfTopRate");
    const band = reachParameterSpread("graduatedRepealFlatShareOfTopRate");
    const top = 10;
    expect(flatRateOf(top, 0, median, band)).toBe(10);
    expect(flatRateOf(top, 1, median, band)).toBe(6.67);
    expect(flatRateOf(top, -0.5, median, band)).toBeLessThan(
      flatRateOf(top, -0.2, median, band),
    );
    expect(flatRateOf(top, undefined, median, band)).toBe(7.86);
  },
);
