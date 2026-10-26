/** Generated play evidence: owners are billed at the rate the law in force sets, paid to the county's tax collector. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

it("bills owners from the law in force, never the state-average fallback", () => {
  const draw = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex"),
    "world-stopgap-housing-property-tax-assumed-data",
  );
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    advanceCore(core, "2027-02-01");
    const assessments = api.moduleState("housing").table("assessments").rows();
    const collector = [...core.organizations.keys()].find((id) =>
      id.startsWith("organization:tax-collector:"),
    );
    // Owners are assessed only when a law supplied the terms and its collector.
    if (assessments.length)
      expect(
        collector,
        `${where}: assessed ${assessments.length} homes`,
      ).toBeDefined();
    expect(
      assessments.filter((row) =>
        String(row.id).startsWith("tax-arrears:unnamed"),
      ),
      where,
    ).toEqual([]);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
