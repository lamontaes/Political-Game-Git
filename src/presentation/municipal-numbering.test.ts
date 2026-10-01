import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
  municipalMeasures,
} from "../simulation/municipal-public-work";
import { nextMeasureNumbering } from "../simulation/measure-numbering";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  municipalMeasureNumberingInput,
  introduceProjectedOrdinance,
} from "./municipal-governing";

function seatedWorld() {
  const place = requireLifePlace("5114968");
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld("municipal-numbering-caller", place.context, {
    peopleCount: 8,
  });
  const personId = world.personOrder[0]!;
  world = { ...world, control: { kind: "person", personId } };
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  world = seatMunicipalMember(world, {
    governmentKey: government.key,
    personId,
    startedAt: world.currentDate,
    role: "member",
    seatLabel: "Controlled member seat",
  });
  return { world, government, personId };
}

describe("municipal numbering presentation boundary", () => {
  it("passes the real body's numbering context to the survivor and preserves saved continuation", () => {
    const { world, government, personId } = seatedWorld();
    const input = municipalMeasureNumberingInput(world, government.key);
    expect(input).not.toBeNull();
    expect(input!.jurisdictionId).toBe(world.jurisdictionOrder[0]);
    expect(input!.originChamber.chamberKey).toBe("council");
    const numbering = nextMeasureNumbering(world, input!);
    const filed = introduceProjectedOrdinance(
      world,
      government.key,
      numbering.designation,
      "Member's sidewalk proposal",
      numbering.numberingSession,
    );
    expect(filed.ok).toBe(true);
    if (!filed.ok) throw new Error(filed.reason);
    const measure = municipalMeasures(filed.world, government.key)[0]!;
    expect(measure.designation).toBe(numbering.designation);
    expect(measure.numberingSession).toEqual(numbering.numberingSession);
    expect(measure.sponsorPersonId).toBe(personId);
    expect(measure.shortTitle).toBe("Member's sidewalk proposal");
    const reloaded = deserializeWorld(serializeWorld(filed.world));
    expect(reloaded).toEqual(filed.world);
    const next = nextMeasureNumbering(
      reloaded,
      municipalMeasureNumberingInput(reloaded, government.key)!,
    );
    expect(next).toEqual(nextMeasureNumbering(filed.world, input!));
    expect(next.designation).not.toBe(numbering.designation);
    expect(municipalMeasures(reloaded, government.key)).toEqual([measure]);
  });

  it("does not manufacture numbering context for a missing government or jurisdiction", () => {
    const { world, government } = seatedWorld();
    expect(
      municipalMeasureNumberingInput(world, "no-such-government"),
    ).toBeNull();
    expect(
      municipalMeasureNumberingInput(
        createScenarioWorld(
          "uninstalled-municipal-context",
          requireLifePlace("2124000").context,
        ),
        government.key,
      ),
    ).toBeNull();
  });
});
