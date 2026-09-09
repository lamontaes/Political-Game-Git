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
  deserializeWorld,
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

function wonAlaskaSeat(): { world: World; personId: EntityId } {
  const life = newAlaskaLife("fiscal-activate1-alaska-seat");
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

  it("opens the LEG proposal adapter for UI's normal Work recipient", () => {
    const won = wonAlaskaSeat();
    expect(LEGISLATIVE_FISCAL_PROPOSAL_INTEGRATION).toEqual({
      authorizationOwner: "LEG",
      normalWorkMountOwner: "UI",
      municipalExecutionOwner: "MUNI",
      unaffectedInterfaces: ["EXEC", "ECON"],
    });
    const result = openLegislativeFiscalProposalAnalysis(
      won.world,
      productionRecords(),
      {
        personId: won.personId,
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "GENERAL_SALES_TAX",
        asOfDate: "2026-09-09",
      },
    );
    expect(result.kind).toBe("opened");
    if (result.kind !== "opened") return;
    expect(result.authority.state).toBe("IN_FORCE");
    expect(result.notice).toMatch(/does not levy a tax/);
    const item = result.world.history.workItems.find(
      (candidate) => candidate.id === result.workItemId,
    );
    const seat = resolveActiveMemberSeat(won.world, won.personId);
    expect(seat.kind).toBe("seated");
    if (seat.kind !== "seated") return;
    expect(item).toMatchObject({
      jurisdictionId: seat.seat.governingJurisdictionId,
      access: { kind: "office" },
    });
    expect(item?.summary).toMatch(/Current authority/);
    expect(item?.summary).toMatch(/proposed change only/);
    expect(item?.summary).not.toMatch(/\$|\bUSD\b|revenue estimate/i);
    expect(deserializeWorld(serializeWorld(result.world))).toStrictEqual(
      result.world,
    );

    const repeated = openLegislativeFiscalProposalAnalysis(
      result.world,
      productionRecords(),
      {
        personId: won.personId,
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "GENERAL_SALES_TAX",
        asOfDate: "2026-09-09",
      },
    );
    expect(repeated.kind).toBe("opened");
    expect(repeated.world.history.workItems).toHaveLength(
      result.world.history.workItems.length,
    );
  });

  it("does not let the legislature exercise municipal taxing authority", () => {
    const won = wonAlaskaSeat();
    const before = serializeWorld(won.world);
    const result = openFiscalAuthorityWork(won.world, productionRecords(), {
      personId: won.personId,
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

    const won = wonAlaskaSeat();
    const missing = openFiscalAuthorityWork(won.world, productionRecords(), {
      personId: won.personId,
      stateUsps: "KY",
      level: "MUNICIPALITY",
      instrument: "GENERAL_SALES_TAX",
      asOfDate: "2026-09-09",
      action: "propose-authority-change",
    });
    expect(missing.kind).toBe("refused");
    expect(missing.authority.state).toBe("UNESTABLISHED");
  });

  it("allows proposal work without converting an unknown baseline into current power", () => {
    const won = wonAlaskaSeat();
    const result = openLegislativeFiscalProposalAnalysis(
      won.world,
      productionRecords(),
      {
        personId: won.personId,
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "TRANSIENT_LODGING_TAX",
        asOfDate: "2026-09-09",
      },
    );
    expect(result.kind).toBe("opened");
    if (result.kind !== "opened") return;
    expect(result.authority.state).toBe("UNESTABLISHED");
    const item = result.world.history.workItems.find(
      (candidate) => candidate.id === result.workItemId,
    );
    expect(item?.summary).toMatch(
      /Current authority as of 2026-09-09: UNESTABLISHED/,
    );
    expect(item?.summary).toMatch(/proposed change only/);
    expect(item?.summary).not.toMatch(/current authority.+PERMITTED/i);
  });
});
