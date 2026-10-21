import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { payrollReserve, sameGovernment } from "./budgets-treasury";
import {
  federalJurisdictionId,
  stateJurisdictionId,
} from "./government-jurisdictions";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { governments } from "./modules/budgets";
import { publicPayTreasuries } from "./public-work-pay";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("an office matches the treasury of its government: by key for a local one, by jurisdiction for a state's or the nation's", () => {
  const a = { governmentFacts: { governmentKey: "gus2025:1" } };
  const b = { governmentFacts: { governmentKey: "gus2025:2" } };
  const stateOffice = {
    governmentFacts: {
      governmentKind: "jurisdiction",
      governmentJurisdictionId: "jurisdiction_state",
    },
  };
  const stateTreasury = {
    governmentFacts: {
      governmentKey: "US-XX",
      governmentJurisdictionId: "jurisdiction_state",
    },
  };
  const otherTreasury = {
    governmentFacts: {
      governmentKey: "US-YY",
      governmentJurisdictionId: "jurisdiction_other",
    },
  };
  expect(sameGovernment(a, a)).toBe(true);
  expect(sameGovernment(a, b)).toBe(false);
  expect(sameGovernment(stateOffice, stateTreasury)).toBe(true);
  expect(sameGovernment(stateOffice, otherTreasury)).toBe(false);
  // A jurisdiction-scoped office never matches a local government's treasury.
  expect(sameGovernment(stateOffice, a)).toBe(false);
  expect(sameGovernment({}, stateTreasury)).toBe(false);
});

// The close of a month keeps back the wages of everyone the treasury pays
// (its own post-holders and the employers it funds), and a state's or the
// nation's treasury names its government by jurisdiction.
it(`a treasury reserves the wages of the employers it funds, seed ${seed}`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "treasury-government-match");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const rows = governments(api);
    const state = rows.find((row) => row.level === "state")!;
    const federal = rows.find((row) => row.level === "federal")!;
    const facts = (id: string) => core.organizations.get(id)!.governmentFacts;
    expect(facts(state.organizationId)?.governmentJurisdictionId).toBe(
      stateJurisdictionId(lawChain(api).stateKey),
    );
    expect(facts(federal.organizationId)?.governmentJurisdictionId).toBe(
      federalJurisdictionId(),
    );
    const links = publicPayTreasuries(core);
    const monthDays = 365 / 12;
    for (const gov of rows) {
      const funded = [...core.organizations.values()].filter(
        (org) =>
          org.publicPayAuthority &&
          links.get(org.publicPayAuthority.id)?.treasuryId ===
            gov.organizationId,
      );
      const wagesOf = (orgId: string) =>
        [...core.jobs.values()]
          .filter((job) => job.organizationId === orgId && !job.endsAt)
          .reduce((n, job) => n + job.wageDailyMinor * monthDays, 0);
      const fundedWages = funded.reduce((n, org) => n + wagesOf(org.id), 0);
      if (!fundedWages) continue;
      const own = wagesOf(gov.organizationId);
      expect(
        payrollReserve(api, gov),
        `${gov.id}: reserve covers ${funded.map((org) => org.name).join(", ")}`,
      ).toBeGreaterThanOrEqual(Math.round(own + fundedWages) - 1);
      console.log(
        `treasury-match: ${place.name} (seed ${seed}:${draw}): ${gov.id} reserves ${funded.map((org) => org.id).join(", ")}`,
      );
      return;
    }
  }
  throw new Error(
    `No drawn place had a funded employer with staff (seed ${seed}).`,
  );
}, 900_000);
