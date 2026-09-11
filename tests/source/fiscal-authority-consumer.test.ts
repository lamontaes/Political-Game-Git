import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

  it("confirms the one remaining gate is district residence, not the two already-cleared ones", () => {
    // Traced against the current schema before writing this test, not
    // assumed: src/simulation/candidate-qualification.ts's Alaska rule set
    // declares districtResidenceYears: known(1), but
    // src/simulation/candidacy.ts always passes districtResidenceSince:
    // null -- "the office carries no district identity, so state residence
    // cannot be reused as proof of district residence" -- because no
    // office anywhere in this simulation carries a district identity at
    // all (grep confirms "district" appears only as an aggregate seat-count
    // multiplier in legislature-rule-packs.ts, never as a per-seat entity).
    // The real Census political-districts source domain
    // (data/source/political-districts, 7283 records, validated by
    // source:validate) has zero consumers anywhere in src/simulation or
    // src/presentation -- nothing joins a person's residence to a numbered
    // legislative district. Building that join is a real feature (district
    // assignment + geography lookup + district-scoped residence tracking),
    // not a bounded integration fix, and inventing a district start date to
    // route around it is exactly the fabricated residence evidence the
    // project's source-provenance rules forbid.
    //
    // This proves the gate that's actually live is that one, not a
    // regression in either already-fixed gate: filing past both the
    // observed-date and state-residency requirements still honestly
    // refuses, and for the district-residence reason specifically.
    const { world, personId } = alaskaLifePastDateAndStateResidency(
      "fiscal-activate1-district-gate",
    );
    expect(() => fileForOffice(world, personId)).toThrow(
      /district-residence rule requires 1 year, but the world has no proved start date/,
    );
  });

  it("documents the blocked positive Work-consumer path, without fabricating it", () => {
    // openLegislativeFiscalProposalAnalysis's actual positive path --
    // opening real Work for a seated Alaska legislator, its notice text,
    // summary content, and serialization round-trip -- cannot be honestly
    // demonstrated while Alaska candidacy is blocked (previous test). A
    // real seat is the only way to construct request.personId here, so
    // there is no seat-shaped input that makes this open rather than
    // refuse without fabricating a win this simulation cannot support.
    //
    // This proves the honest current behavior instead: with a real person
    // who genuinely cannot be seated, the Work consumer refuses rather
    // than opening. When district identity/residence exists, replace this
    // test with the real positive proof (restore a wonAlaskaSeat()-style
    // helper from this file's git history and assert result.kind ===
    // "opened", the LEG/UI/MUNI-mounted item, notice text, and
    // serialization round-trip).
    const life = newAlaskaLife("fiscal-activate1-blocked-positive");
    const result = openLegislativeFiscalProposalAnalysis(
      life.world,
      productionRecords(),
      {
        personId: life.personId,
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "GENERAL_SALES_TAX",
        asOfDate: "2026-09-09",
      },
    );
    expect(result.kind).toBe("refused");

    // The decoder half of the same scenario ("allows proposal work without
    // converting an unknown baseline into current power") is independent of
    // any seat, and still holds: TRANSIENT_LODGING_TAX genuinely decodes to
    // UNESTABLISHED, not a fabricated PERMITTED.
    const baseline = queryFiscalAuthority(productionRecords(), {
      stateUsps: "AK",
      level: "MUNICIPALITY",
      instrument: "TRANSIENT_LODGING_TAX",
      asOfDate: "2026-09-09",
    });
    expect(baseline.state).toBe("UNESTABLISHED");
  });
});
