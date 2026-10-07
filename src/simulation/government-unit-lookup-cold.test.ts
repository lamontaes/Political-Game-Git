import { describe, expect, it } from "vitest";
import { LEGISLATIVE_RULE_PACKS, rulePackById } from "./legislature-rule-packs";
import { withCommitteeStandIns } from "./standing-committee";
import { governmentUnit, municipioUnit } from "./government-units";
import acsPlaces from "../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import { createHash } from "node:crypto";

const seed = "government-unit-cold-identity-20261001";
const geoids = Object.keys(acsPlaces.puertoRicoMunicipios)
  .sort((left, right) =>
    createHash("sha256")
      .update(`${seed}:${left}`)
      .digest("hex")
      .localeCompare(
        createHash("sha256").update(`${seed}:${right}`).digest("hex"),
      ),
  )
  .slice(0, 5);

describe(`cold legislative lookup with municipio identities (seed ${seed})`, () => {
  it("initializes actual rule packs before any playable world", () => {
    expect(LEGISLATIVE_RULE_PACKS.length).toBeGreaterThan(0);
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      expect(rulePackById(pack.packId)).toBe(withCommitteeStandIns(pack));
    }
    expect(geoids).toHaveLength(5);
  });
  it.each(geoids)(
    "resolves existing municipio %s through the canonical reader",
    (geoid) => {
      const unit = municipioUnit(geoid);
      expect(unit).not.toBeNull();
      expect(governmentUnit(unit!.id)).toEqual(unit);
    },
  );
});
