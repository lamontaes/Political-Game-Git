import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { prosecutorFor } from "./justice-law";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

// Appointed attorneys general are offices in the offices data (pool:
// gov-stopgap-justice-law-missing-data, row SG-GOV-justice-prosecutor-stand-in):
// in a state or territory where the office is appointed, the world opens with
// an attorney general or secretary of justice holding it, not elected, and the
// justice engine's prosecutor is that office rather than a stand-in.
const APPOINTED = ["AK", "HI", "ME", "NH", "NJ", "TN", "WY", "PR", "VI", "AS"];

it("seats an appointed attorney general in a state whose attorney general is appointed, and the justice engine prosecutes through it", () => {
  const seed = process.env.APPOINTED_AG_SEED ?? randomBytes(8).toString("hex");
  setBookkeeping(false);
  const tried: string[] = [];
  // A county prosecutor covering the town prosecutes first, so the check
  // needs an appointed-AG place with none.
  for (let i = 0, built = 0; i < 4000 && built < 8; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "appointed-ag");
    if (!APPOINTED.some((usps) => place.state === `US-${usps}`)) continue;
    built += 1;
    const where = `${place.name} [${place.key}], seed ${seed}:${i}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const office = offices
      .table("offices")
      .get(`office:${place.state}:attorney-general`) as unknown as
      { id: string; elected: boolean } | undefined;
    expect(office, where).toBeTruthy();
    expect(office!.elected, where).toBe(false);
    const term = (offices.table("terms").rows() as unknown as TermRow[]).find(
      (t) => t.officeId === office!.id && t.status === "serving",
    );
    expect(term?.personId, where).toBeTruthy();
    const prosecutor = prosecutorFor(api);
    if (prosecutor.level === "county") {
      tried.push(`${where}: a county prosecutor covers the town`);
      continue;
    }
    // The justice engine's prosecutor is the office, not the stand-in.
    expect(prosecutor.officeId, where).toBe(office!.id);
    expect(prosecutor.personId, where).toBe(term!.personId);
    return;
  }
  throw new Error(
    `No appointed-AG place without a county prosecutor: ${tried.join("; ")}`,
  );
}, 1_800_000);
