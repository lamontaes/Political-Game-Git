/**
 * A public worker folded into the counted tier is still on the employer's pay
 * authority, so payday finds their commitment (pool item
 * core-year-crash-counted-teacher-commitment-not-in-authority). The repro
 * place (seed m7a, Discovery Harbor, Hawaii) plays a full year, and two places
 * drawn from all 56 do the same; set COUNTED_AUTHORITY_SEED to reproduce the
 * drawn two.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const drawn =
  process.env.COUNTED_AUTHORITY_SEED ?? randomBytes(8).toString("hex");
const cases = [
  { name: "repro", place: drawPlace("m7a", "speed-year"), demoted: true },
  {
    name: "drawn 1",
    place: drawPlace(`${drawn}:1`, "counted-authority"),
    demoted: false,
  },
  {
    name: "drawn 2",
    place: drawPlace(`${drawn}:2`, "counted-authority"),
    demoted: false,
  },
];

for (const { name, place, demoted } of cases) {
  it(`${name}: every open commitment at an employer with a pay authority is on it, through a played year`, () => {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const checked: string[] = [];
    const missing: string[] = [];
    for (const c of core.work.commitments.values()) {
      if (c.endsAt !== undefined || c.publicPayAuthorityId === undefined)
        continue;
      const authority = core.organizations.get(
        c.organizationId,
      )?.publicPayAuthority;
      if (authority?.id !== c.publicPayAuthorityId) continue;
      checked.push(c.id);
      if (!authority.workCommitmentIds.includes(c.id)) missing.push(c.jobId);
    }
    expect(
      checked.length,
      `${where}: no public commitment was checked`,
    ).toBeGreaterThan(0);
    if (demoted)
      expect(
        checked.some((id) => id.includes(":counted:")),
        `${where}: no demoted counted worker among the checked`,
      ).toBe(true);
    expect(missing, where).toEqual([]);
  }, 1_200_000);
}
