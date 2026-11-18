/**
 * A mayor the council chooses from among its own members (the town's reading
 * says the voters do not elect one): the world opens with that chair held by
 * a sitting council member, and the council's president is the same person,
 * so the town never has a mayor and a council president who differ.
 *
 * The case exists only in towns whose reading says the council chooses, so
 * the test draws among those towns and names any it passes over.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats, type TermRow } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { openLeadership, presidingOfficer } from "./modules/leadership";
import {
  municipalGovernments,
  primaryReading,
} from "./gov-rules/municipal-government";
import { readDirectElection } from "./gov-rules/local-chief-executive-rules";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`council-mayor:${Date.now()}`).digest("hex");
process.stdout.write(`council-chosen mayor: seed ${seed}\n`);

const towns = municipalGovernments()
  .filter((g) => {
    const reading = primaryReading(g);
    return g.placeGeoid && reading && readDirectElection(reading) === false;
  })
  .map((g) => g.placeGeoid!)
  .sort();

function order(): string[] {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}:${key}`).digest("hex");
  return [...towns].sort((a, b) => rank(a).localeCompare(rank(b)));
}

describe("a mayor the council chooses", () => {
  it("is a sitting council member and the council's president", () => {
    expect(towns.length).toBeGreaterThan(0);
    const passed: string[] = [];
    for (const placeKey of order()) {
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed, core.date);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openLeadership(core);
      const api = coreAPI(core);
      const where = `place ${placeKey}, seed ${seed}`;
      const seats = townSeats(api);
      const mayor = seats.find(
        (s) => s.office.kind === "mayor" && !s.office.elected,
      );
      const council = seats.filter((s) => s.office.kind === "council");
      // A town whose units carry no council, or no chosen mayor, has no case.
      if (!mayor || !council.length) {
        passed.push(`${placeKey} (no council-chosen mayor among its offices)`);
        continue;
      }
      if (passed.length)
        process.stdout.write(`passed over: ${passed.join("; ")}\n`);
      expect(mayor.holder, `${where}: ${mayor.seat.id}`).not.toBeNull();
      const holderId = mayor.holder!.personId;
      expect(holderId, where).not.toBeNull();
      const members = council
        .map((s) => s.holder)
        .filter((t): t is TermRow => !!t)
        .map((t) => t.personId);
      expect(members, where).toContain(holderId);
      expect(presidingOfficer(api, council[0]!.office.id), where).toBe(
        holderId,
      );
      process.stdout.write(
        `${where}: ${mayor.office.title} ${mayor.holder!.identity.givenName} ${mayor.holder!.identity.familyName} (${holderId}) presides over ${council[0]!.office.id}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn town had a council-chosen mayor; passed over ${passed.join("; ")}`,
    );
  }, 300_000);
});
