/**
 * A public worker folded into the counted tier is still on the employer's pay
 * authority, so payday finds their commitment (pool item
 * core-year-crash-counted-teacher-commitment-not-in-authority). A place is
 * drawn from all 56; set COUNTED_AUTHORITY_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed =
  process.env.COUNTED_AUTHORITY_SEED ?? randomBytes(8).toString("hex");

it("every open commitment at an employer with a pay authority is on it", () => {
  const place = drawPlace(seed, "counted-authority");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 200));
  const missing: string[] = [];
  for (const c of core.work.commitments.values()) {
    if (c.endsAt !== undefined || c.publicPayAuthorityId === undefined)
      continue;
    const authority = core.organizations.get(
      c.organizationId,
    )?.publicPayAuthority;
    if (authority?.id !== c.publicPayAuthorityId) continue;
    if (!authority.workCommitmentIds.includes(c.id)) missing.push(c.jobId);
  }
  expect(missing, where).toEqual([]);
}, 900_000);
