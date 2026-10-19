import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import schools from "../core2/data/opening-public-schools.json";
import tuitionData from "../core2/data/opening-private-tuition.json";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import type { CoreInput } from "../core2/types";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "bench-opening-records");

describe(`played opening in ${place.name}, seed ${seed}`, () => {
  it("keeps the young player and installs the core sample, school and tuition records", () => {
    setBookkeeping(false);
    let input: CoreInput | undefined;
    const world = buildBenchWorld(place.seed, "2026-01-01", {
      placeKey: place.key,
      twoLevel: true,
      settings: { population: 1500 },
      onOpening: (opening) => {
        input = opening;
      },
    });
    const opening = input!;
    const player = world.core.people.get(world.playerId!)!;
    expect(
      ageOnDate(makeIsoDate(player.birthDate), makeIsoDate(world.core.date)),
    ).toBe(17);
    const weights = JSON.parse(
      opening.placeMetadata!.representativeWeights!,
    ) as Record<string, number>;
    expect(Object.keys(weights).length).toBeGreaterThan(0);
    for (const [id, weight] of Object.entries(weights)) {
      expect(opening.people.some((person) => person.id === id)).toBe(true);
      expect(weight).toBeGreaterThan(0);
    }
    expect(opening.residents!.households.length).toBeGreaterThan(0);
    const jobs = [
      ...opening.jobs,
      ...opening.residents!.households.flatMap((home) => home.jobs),
    ];
    const raw = opening.placeMetadata!.openingPublicSchools;
    if (raw) {
      const receipt = JSON.parse(raw) as {
        organizationId: string;
        teachers: number;
      };
      expect(
        opening.organizations.find((org) => org.id === receipt.organizationId)
          ?.classification,
      ).toBe(schools.classification);
      expect(
        jobs.filter((job) => job.organizationId === receipt.organizationId),
      ).toHaveLength(receipt.teachers);
    }
    const contracts = [
      ...(opening.finance?.contracts ?? []),
      ...opening.residents!.households.flatMap((home) => home.contracts),
    ];
    const tuition = contracts.filter(
      (row) => row.kind === tuitionData.contractKind,
    );
    const privateSchools = opening.organizations.filter(
      (org) => org.classification === tuitionData.supplierClassification,
    );
    if (privateSchools.length) expect(tuition.length).toBeGreaterThan(0);
    else expect(tuition).toHaveLength(0);
    expect(new Set(tuition.map((row) => row.id)).size).toBe(tuition.length);
    for (const row of tuition) {
      expect(privateSchools.some((school) => school.id === row.payeeId)).toBe(
        true,
      );
      expect(row.amountMinor).toBeGreaterThan(0);
    }
  }, 600_000);
});
