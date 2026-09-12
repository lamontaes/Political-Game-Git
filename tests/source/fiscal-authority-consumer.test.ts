import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../../src/districts/catalog";
import {
  bindingFromIdentity,
  districtIdentityByRecordId,
} from "../../src/districts/query";
import type { ArtifactLock } from "../../src/source/core/index";
import { adaptFiscalAuthorityRecords } from "../../src/source/adapters/fiscal-authority";
import {
  currentTaxPermission,
  queryFiscalAuthority,
} from "../../src/fiscal-authority/query";
import { sourceDomain } from "../../src/source/domains/state-local-fiscal-authority";
import {
  serializeWorld,
  type EntityId,
  type World,
} from "../../src/simulation";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "../../src/presentation/campaign-projection";
import { openFiscalAuthorityWork } from "../../src/presentation/fiscal-authority-work";
import {
  LEGISLATIVE_FISCAL_PROPOSAL_INTEGRATION,
  openLegislativeFiscalProposalAnalysis,
} from "../../src/presentation/legislative-fiscal-proposal";
import { resolveActiveMemberSeat } from "../../src/presentation/legislative-member-seat";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";

const ROOT = resolve(import.meta.dirname, "../..");

function productionRecords() {
  const lock = JSON.parse(
    readFileSync(
      resolve(
        ROOT,
        "data/source/state-local-fiscal-authority/artifact-lock.json",
      ),
      "utf-8",
    ),
  ) as ArtifactLock;
  return adaptFiscalAuthorityRecords(
    sourceDomain.compileProduction(lock).records,
  );
}

function newAlaskaLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "alaska",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

/**
 * Clears the two accepted gates that are NOT this file's concern before
 * filing: the Alaska Constitution's `observedCurrentOn` date, and the
 * sourced 3-year state-residency requirement (see the district-residence
 * test below for the one gate this file is actually about).
 * `character-history` establishes state residence "proved" only from world
 * creation forward (a procedural placeholder, not backdated to birthplace
 * even when it matches), so the sourced 3-year requirement needs 3 elapsed
 * in-game years, not just the observation date, before it is satisfied.
 */
function alaskaLifePastDateAndStateResidency(seed: string) {
  const life = newAlaskaLife(seed);
  return { ...life, world: passOrdinaryDays(life.world, 1200) };
}

function adakHouseThirtySeven() {
  const identity = districtIdentityByRecordId(
    districtIdentityCatalog(),
    "state-lower:02037",
  );
  if (!identity) throw new Error("Missing Alaska House District 37 identity.");
  return bindingFromIdentity(identity);
}

function adakLifePastResidency(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "0200065",
    questionnaire: "skipped",
  });
  return {
    world: passOrdinaryDays(
      openOrdinaryLife(built.world, built.playerPersonId),
      1200,
    ),
    personId: built.playerPersonId,
  };
}

/**
 * A real, currently-supported seat, used only to exercise the Work
 * consumer's cross-jurisdiction check honestly (see "refuses an unseated
 * person and a seat from the wrong jurisdiction" below). Kentucky hits
 * neither Alaska-specific gate. Mirrors the accepted wonSeat() pattern in
 * src/presentation/legislative-member-seat.test.ts rather than
 * duplicating a second implementation of the same campaign-winning
 * sequence.
 */
function wonKentuckySeat(): { world: World; personId: EntityId } {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    // Reuses the exact accepted seed from legislative-member-seat.test.ts's
    // wonSeat() ("p85c-owner-0"), rather than a fresh one whose campaign
    // outcome is unverified -- a losing campaign proves nothing about the
    // cross-jurisdiction refusal this fixture exists for.
    seed: "p85c-owner-0",
    startAge: 34,
    placeKey: "lexington-fayette",
    questionnaire: "skipped",
  });
  const life = {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
  let world = fileForOffice(life.world, life.personId);
  world = spendAnAfternoon(world, life.personId, "fundraising");
  for (let index = 0; index < 3; index += 1) {
    world = passOrdinaryDays(world);
    world = spendAnAfternoon(world, life.personId, "outreach");
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(world, life.personId).phase === "active";
    day += 1
  ) {
    world = passOrdinaryDays(world);
  }
  expect(projectCampaign(world, life.personId).phase).toBe("won");
  expect(resolveActiveMemberSeat(world, life.personId).kind).toBe("seated");
  return { world, personId: life.personId };
}

describe("source to record to Work consumer", () => {
  it("answers materially different enacted tax, cap, and bond questions", () => {
    const records = productionRecords();
    const property = queryFiscalAuthority(records, {
      stateUsps: "AK",
      level: "COUNTY",
      instrument: "PROPERTY_TAX",
      asOfDate: "2026-09-09",
    });
    expect(property.state).toBe("IN_FORCE");
    expect(currentTaxPermission(property)).toBe("PERMITTED");

    const millage = queryFiscalAuthority(records, {
      stateUsps: "AK",
      level: "MUNICIPALITY",
      field: "NOMINAL_MILLAGE_CAP_MILLS",
      asOfDate: "2026-09-09",
    });
    expect(millage.state).toBe("IN_FORCE");
    if (millage.state !== "IN_FORCE") return;
    expect(millage.record).toMatchObject({
      kind: "FISCAL_RULE",
      value: 30,
      source: {
        artifactId: "ak-municipal-property-tax-statutes",
        citation: "Alaska Stat. §§ 29.45.090(a), 29.45.100",
      },
    });
    expect(millage.record.source).toMatchObject({
      enactedDate: null,
      effectiveDate: "1986-01-01",
      lastAmendedDate: null,
      observedDate: "2026-09-09",
      versionApplicability: "FOUNDATIONAL_AND_OBSERVED_POINTS",
    });
    expect(millage.record.source.effectiveDateDerivation).toMatch(
      /ak-ch-74-sla-1985-enrolled-session-law.*30dfaeab42ba7a22/,
    );
    expect(millage.record.constraints.join(" ")).toMatch(/bond principal/);

    const bondVote = queryFiscalAuthority(records, {
      stateUsps: "AK",
      level: "COUNTY",
      field: "LOCAL_GO_BOND_VOTER_HURDLE",
      asOfDate: "2026-09-09",
    });
    expect(bondVote.state).toBe("IN_FORCE");
    if (bondVote.state !== "IN_FORCE") return;
    expect(bondVote.record).toMatchObject({
      kind: "FISCAL_RULE",
      value: "SIMPLE_MAJORITY",
      source: {
        artifactId: "ak-municipal-general-obligation-bond-statutes",
        citation: "Alaska Stat. § 29.47.190(a)",
      },
    });
  });

  it("answers real-corpus boundaries without inventing amendment continuity", () => {
    const records = productionRecords();
    const query = (asOfDate: string) =>
      queryFiscalAuthority(records, {
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "PROPERTY_TAX",
        asOfDate,
      });
    expect(query("1985-12-31").state).toBe("NOT_YET_EFFECTIVE");
    expect(query("1986-01-01").state).toBe("IN_FORCE");
    const untraced = query("1990-06-01");
    expect(untraced.state).toBe("UNESTABLISHED");
    if (untraced.state === "UNESTABLISHED") {
      expect(untraced.reason).toMatch(
        /amendment history is not fully acquired/,
      );
    }
    expect(query("2026-09-09").state).toBe("IN_FORCE");
    const future = query("2026-09-10");
    expect(future.state).toBe("UNESTABLISHED");
    if (future.state === "UNESTABLISHED") {
      expect(future.reason).toMatch(/does not project legal authority/);
    }

    const actual = records.find(
      (record) =>
        record.kind === "TAX_INSTRUMENT" &&
        record.recordId === "AK:MUNICIPALITY:instrument:PROPERTY_TAX",
    );
    if (!actual) throw new Error("Expected real property-tax record.");
    expect(
      queryFiscalAuthority(
        [...records, { ...actual, recordId: `${actual.recordId}:conflict` }],
        {
          stateUsps: "AK",
          level: "MUNICIPALITY",
          instrument: "PROPERTY_TAX",
          asOfDate: "2026-09-09",
        },
      ).state,
    ).toBe("CONFLICTING");
    expect(
      queryFiscalAuthority(records, {
        stateUsps: "AK",
        level: "SPECIAL_DISTRICT",
        instrument: "PROPERTY_TAX",
        asOfDate: "2026-09-09",
      }).state,
    ).toBe("UNESTABLISHED");
  });

  it("declares the LEG/UI/MUNI Work-mount contract", () => {
    expect(LEGISLATIVE_FISCAL_PROPOSAL_INTEGRATION).toEqual({
      authorizationOwner: "LEG",
      normalWorkMountOwner: "UI",
      municipalExecutionOwner: "MUNI",
      unaffectedInterfaces: ["EXEC", "ECON"],
    });
  });

  it("does not let the legislature exercise municipal taxing authority", () => {
    // "exercise-current-authority" refuses unconditionally, before any seat
    // is resolved (openFiscalAuthorityWork checks request.action first) --
    // so an unseated person demonstrates this exactly as well as a seated
    // one would, and doesn't need Alaska candidacy to succeed.
    const life = newAlaskaLife("fiscal-activate1-unseated-exercise");
    const before = serializeWorld(life.world);
    const result = openFiscalAuthorityWork(life.world, productionRecords(), {
      personId: life.personId,
      stateUsps: "AK",
      level: "MUNICIPALITY",
      instrument: "GENERAL_SALES_TAX",
      asOfDate: "2026-09-09",
      action: "exercise-current-authority",
    });
    expect(result.kind).toBe("refused");
    if (result.kind !== "refused") return;
    expect(result.reason).toMatch(/not the supported local governing office/);
    expect(serializeWorld(result.world)).toBe(before);
  });

  it("refuses an unseated person and a seat from the wrong jurisdiction", () => {
    const life = newAlaskaLife("fiscal-activate1-unseated");
    const unseated = openFiscalAuthorityWork(life.world, productionRecords(), {
      personId: life.personId,
      stateUsps: "AK",
      level: "MUNICIPALITY",
      instrument: "GENERAL_SALES_TAX",
      asOfDate: "2026-09-09",
      action: "propose-authority-change",
    });
    expect(unseated.kind).toBe("refused");

    // A real seat, just not one that governs Alaska. Kentucky is the
    // currently-supported jurisdiction (src/presentation/
    // legislative-member-seat.test.ts); this exercises the function's own
    // cross-jurisdiction refusal, which is not Alaska-specific.
    const won = wonKentuckySeat();
    const missing = openFiscalAuthorityWork(won.world, productionRecords(), {
      personId: won.personId,
      stateUsps: "AK",
      level: "MUNICIPALITY",
      instrument: "GENERAL_SALES_TAX",
      asOfDate: "2026-09-09",
      action: "propose-authority-change",
    });
    expect(missing.kind).toBe("refused");
    if (missing.kind !== "refused") return;
    expect(missing.reason).toMatch(
      /current legislative seat does not govern the state named/,
    );
  });

  it("confirms statewide Alaska still cannot file without proved district residence", () => {
    const { world, personId } = alaskaLifePastDateAndStateResidency(
      "fiscal-activate1-district-gate",
    );
    expect(() => fileForOffice(world, personId)).toThrow(
      /district-residence rule requires 1 year, but the world has no proved start date/,
    );
  });

  it("runs ordinary Adak filing, election, and fiscal Work without forcing a win", () => {
    const { world, personId } = adakLifePastResidency(
      "fiscal-activate1-adak-join",
    );
    let next = fileForOffice(world, personId, adakHouseThirtySeven());
    next = spendAnAfternoon(next, personId, "fundraising");
    for (
      let day = 0;
      day < 60 && projectCampaign(next, personId).phase === "active";
      day += 1
    ) {
      next = passOrdinaryDays(next);
    }
    const phase = projectCampaign(next, personId).phase;
    expect(["won", "lost"]).toContain(phase);
    const seat = resolveActiveMemberSeat(next, personId);
    const result = openLegislativeFiscalProposalAnalysis(
      next,
      productionRecords(),
      {
        personId,
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "GENERAL_SALES_TAX",
        asOfDate: "2026-09-09",
      },
    );
    if (seat.kind === "seated") {
      expect(result.kind).toBe("opened");
      if (result.kind === "opened") {
        expect(result.notice).toMatch(/proposed change/);
        expect(serializeWorld(result.world)).not.toBe(serializeWorld(next));
      }
    } else {
      expect(result.kind).toBe("refused");
    }

    const baseline = queryFiscalAuthority(productionRecords(), {
      stateUsps: "AK",
      level: "MUNICIPALITY",
      instrument: "TRANSIENT_LODGING_TAX",
      asOfDate: "2026-09-09",
    });
    expect(baseline.state).toBe("UNESTABLISHED");
  }, 180_000);
});
