import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { governmentUnit, governmentUnitsForState } from "./government-units";
import acsPlaces from "../../data/research/money/place-population-acs-2024.json" with { type: "json" };
import { lifePlaceByKey } from "./life-places";
import { municipioUnit } from "./nationwide-world/county-governing-body-rules";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";

const seed = "government-unit-lookup-all56-20261001";
const rank = (id: string) =>
  createHash("sha256").update(`${seed}:${id}`).digest("hex");
const catalog = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap(governmentUnitsForState)
  .filter((unit) => unit.functionalActive)
  .sort((left, right) => rank(left.id).localeCompare(rank(right.id)))
  .slice(0, 5);
const municipios = Object.keys(acsPlaces.puertoRicoMunicipios)
  .flatMap((geoid) => municipioUnit(geoid) ?? [])
  .sort((left, right) => rank(left.id).localeCompare(rank(right.id)))
  .slice(0, 5);

describe(`canonical government-unit lookup (seed ${seed})`, () => {
  it("samples actual catalog governments and municipios from existing data", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(catalog).toHaveLength(5);
    expect(municipios).toHaveLength(5);
    expect(
      new Set([...catalog, ...municipios].map((unit) => unit.id)).size,
    ).toBe(10);
  });

  it.each(catalog)("preserves catalog identity $id", (unit) => {
    expect(governmentUnit(unit.id)).toBe(unit);
  });

  it.each(municipios)("resolves the recorded municipio $id", (unit) => {
    expect(governmentUnit(unit.id)).toEqual(unit);
    const place = lifePlaceByKey(`county:${unit.countyGeoid}`)!;
    const { name, parentName } = place.context.jurisdiction;
    const suffix = parentName ? `, ${parentName}` : "";
    expect(unit.name).toBe(
      suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name,
    );
    expect(governmentUnit(unit.id)?.countyGeoid).toBe(unit.countyGeoid);
    expect(governmentUnit(unit.id)?.stateUsps).toBe(unit.stateUsps);
  });

  it("does not invent a government for an unread identity", () => {
    expect(governmentUnit("unread-government")).toBeNull();
    expect(governmentUnit("municipio:unread-geoid")).toBeNull();
    expect(governmentUnit("municipio:")).toBeNull();
  });
});
