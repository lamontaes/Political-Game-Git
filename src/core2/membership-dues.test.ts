/** Union membership is recorded on each member's job, and dues follow those records. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import unionData from "./data/business/union-membership.json" with { type: "json" };
import businessParameters from "./data/business/parameters.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { CoreInput, JobInput } from "./types";

const RATES = (unionData as { states: Record<string, { membersPct: number }> })
  .states;
const NATION = (unionData as { nationMembersPct: number }).nationMembersPct;
const SHARE = (
  businessParameters as unknown as Record<string, { value: number }>
).businessUnionDuesShare!.value;

it("records each member on a job, to the state's rate, and dues are the members' own pay share", () => {
  setBookkeeping(false);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const draw = drawPlace(randomBytes(32).toString("hex"), "union-members");
    const label = `${draw.key} seed ${draw.seed}`;
    let opening: CoreInput | undefined;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
      onOpening: (input: CoreInput) => {
        opening = input;
      },
    });
    const input = opening!;
    const unions = input.organizations.filter(
      (row) =>
        (row as { classification?: string }).classification ===
        "membership:labor-union",
    );
    if (!unions.length) continue;
    const placeOf = new Map(input.organizations.map((o) => [o.id, o.placeId]));
    const jobs: JobInput[] = [
      ...input.jobs,
      ...input.residents!.households.flatMap((row) => row.jobs),
    ].filter(
      (job) => job.endsAt === undefined && placeOf.has(job.organizationId),
    );
    const rate =
      RATES[input.placeMetadata?.housingState ?? ""]?.membersPct ?? NATION;
    for (const union of unions) {
      const here = jobs.filter(
        (job) => placeOf.get(job.organizationId) === union.placeId,
      );
      const members = here.filter((job) => job.unionLocalId === union.id);
      expect(members.length, label).toBe(
        Math.round((here.length * rate) / 100),
      );
      const full = new Set(input.people.map((person) => person.id));
      const monthly = (job: JobInput) =>
        (job.wageDailyMinor * 365 * SHARE) / 12;
      // A full member pays from their own cash through a standing bill.
      for (const job of members.filter((j) => full.has(j.personId))) {
        const contract = input.finance?.contracts.find(
          (c) => c.id === `dues:${union.id}:${job.personId}`,
        );
        expect(contract?.payerIds, label).toEqual([job.personId]);
        expect(contract?.amountMinor, label).toBe(Math.round(monthly(job)));
      }
      // The counted members' dues come from their place's pooled cash.
      const flow = input.residents!.flows.find(
        (f) => f.id === `dues:${union.id}`,
      );
      const dues = Math.round(
        members
          .filter((j) => !full.has(j.personId))
          .reduce((n, job) => n + monthly(job), 0),
      );
      if (dues > 0) expect(flow?.amountMinor, label).toBe(dues);
    }
    // No job names a local it does not belong to.
    for (const job of jobs)
      if (job.unionLocalId)
        expect(
          unions.some((u) => u.id === job.unionLocalId),
          label,
        ).toBe(true);
    // The standing bills run: two months pass without the ledger refusing them.
    advanceCore(core, addDays(makeIsoDate(core.date), 62));
    return;
  }
  throw new Error("No drawn place in five had a union local.");
}, 900_000);
