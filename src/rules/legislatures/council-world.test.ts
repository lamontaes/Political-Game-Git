import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  municipalGovernmentForLifePlace,
  municipalProcedureReading,
  primaryReading,
  municipalRulePackFor,
  municipalRuleSourceRef,
  localFiscalAuthorityScopeForRulePackId,
} from "../../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
  municipalSeats as nativeSeats,
  municipalOrganizationFor,
  municipalGovernmentJurisdictionId,
  municipalStanding,
  evaluateMunicipalManagerElection as nativeElection,
} from "../../simulation/municipal-public-work";
import { organizationProfileAt } from "../../simulation/life-queries";
import * as nativeFiscal from "../../simulation/local-fiscal-authority";
import {
  localFiscalAuthorityFor,
  admitLocalFiscalMeasure,
  type LocalFiscalFacts,
} from "./local-fiscal-admission";
import {
  municipalSeats,
  municipalIntroductionRoles,
} from "./municipal-membership";
import {
  evaluateMunicipalManagerElection,
  type CouncilVoteFacts,
} from "./council-vote";
import matrix from "../../../data/research/money/local-tax-authority-matrix.json";
import incomeScope from "../../../data/research/money/local-income-tax-scope.json";
import type {
  EntityId,
  LegislativeVoteDisposition,
} from "../../simulation/types";
describe("legislatures: municipal membership, election and fiscal authority callers", () => {
  it.each(Object.keys(STATES))(
    "matches the native saved council and admission rules in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-council:${place}`,
        people: 12,
      });
      let world = base.world;
      const government = municipalGovernmentForLifePlace(base.place);
      if (!government) {
        const facts: CouncilVoteFacts = {
          reading: null,
          councilors: [],
          quorumSource: {
            authority: "game-profile",
            citation: "Fixture",
            sourceTitle: "Fixture",
            sourceUrl: null,
            retrievedAt: null,
            verification: "game-profile",
            note: null,
          },
          appointmentSource: {
            authority: "game-profile",
            citation: "Fixture",
            sourceTitle: "Fixture",
            sourceUrl: null,
            retrievedAt: null,
            verification: "game-profile",
            note: null,
          },
          managerElectionThreshold: null,
        };
        expect(
          evaluateMunicipalManagerElection(facts, {
            governmentKey: `missing:${place}`,
            dispositions: [],
          }),
        ).toEqual(
          nativeElection(world, {
            governmentKey: `missing:${place}`,
            dispositions: [],
          }),
        );
        return;
      }
      world = installMunicipalGovernment(world, {
        governmentKey: government.key,
        jurisdictionId: base.jurisdictionId,
        formedAt: world.currentDate,
      });
      const reading = primaryReading(government);
      for (let index = 0; index < Math.min(8, reading.bodySize ?? 5); index++)
        world = seatMunicipalMember(world, {
          governmentKey: government.key,
          personId: world.personOrder[index]!,
          startedAt: world.currentDate,
          role: index === 0 ? "presiding-member" : "member",
          seatLabel: `Authored seat ${index + 1}`,
        });
      const organization = municipalOrganizationFor(world, government.key),
        membership = {
          onDate: world.currentDate,
          nextSequence: world.history.nextSequence,
          organization,
          participations: world.history.organizationParticipations,
          states: world.history.organizationParticipationStates,
        };
      const seats = municipalSeats(membership, government.key);
      expect(seats).toEqual(nativeSeats(world, government.key));
      expect(
        municipalIntroductionRoles(membership, seats[0]!.personId),
      ).toEqual(
        municipalStanding(world, {
          governmentKey: government.key,
          personId: seats[0]!.personId,
          residentPlaceGeoid: null,
        }).roles,
      );
      const compiled = municipalRulePackFor(government);
      const councilors = seats.filter(
        (row) => row.role === "member" || row.role === "presiding-member",
      );
      const appointment = reading.powers.find(
        (row) =>
          row.power === "APPOINTMENT" &&
          (row.heldByRole === "COUNCIL" || row.heldByRole === "COMMISSION"),
      );
      const facts: CouncilVoteFacts = {
        reading,
        councilors,
        quorumSource: municipalRuleSourceRef(
          reading,
          reading.procedure.quorumText ?? "quorum",
        ),
        appointmentSource: municipalRuleSourceRef(
          reading,
          appointment?.conditions.join(" ") || "manager election",
        ),
        managerElectionThreshold: compiled.ok
          ? (compiled.pack.councilActions?.managerElectionThreshold ?? null)
          : null,
      };
      const rows: LegislativeVoteDisposition[] = councilors.map(
        (row, index) => ({
          memberKey: `fixture:${index}`,
          personId: row.personId,
          disposition: "yea",
        }),
      );
      for (const dispositions of [
        rows,
        [],
        rows.map((row) => ({ ...row, disposition: "absent" as const })),
        rows.map((row, index) => ({
          ...row,
          disposition:
            index % 2 ? ("nay" as const) : ("present-not-voting" as const),
        })),
        [rows[0]!, rows[0]!],
        [{ ...rows[0]!, personId: "missing" as EntityId }],
      ])
        expect(
          evaluateMunicipalManagerElection(facts, {
            governmentKey: government.key,
            dispositions,
          }),
        ).toEqual(
          nativeElection(world, {
            governmentKey: government.key,
            dispositions,
          }),
        );
      world = {
        ...world,
        control: { kind: "person", personId: seats[0]!.personId },
      };
      const scope = compiled.ok
        ? localFiscalAuthorityScopeForRulePackId(compiled.pack.packId)
        : null;
      const fiscal: LocalFiscalFacts = {
        matrix,
        incomeScope,
        control: world.control,
        policyCatalog: world.policyCatalog,
        jurisdictionIds: new Set(world.jurisdictionOrder),
        government,
        rules: compiled,
        scope,
        organization,
        organizationLocationId: organization
          ? (organizationProfileAt(world, organization.id)
              ?.locationJurisdictionId ?? null)
          : null,
        governmentJurisdictionId: municipalGovernmentJurisdictionId(
          world,
          government.key,
        ),
        taxPlace: scope
          ? {
              stateUsps: place,
              level:
                scope.authority.level === "county" ? "COUNTY" : "MUNICIPALITY",
            }
          : null,
        measures: world.history.legislativeMeasures ?? [],
        lineages: world.history.legislativeDraftLineages ?? [],
        provisions: world.history.legislativeProvisions ?? [],
        taxProposals: world.history.taxProposals ?? [],
        levyTexts: new Map(),
        membership,
        introductionBasis:
          municipalProcedureReading(government).procedure
            .introductionSponsorship ?? "",
        governmentDisplayName: reading.displayName,
        governmentBodyName: reading.bodyName,
      };
      const keys = [
        "missing",
        "us-policy-positions:transportation-infrastructure.fix-it-first",
        ...world.policyCatalog.propositionOrder
          .map((id) => world.policyCatalog.propositions[id]!)
          .filter(
            (row) =>
              row.stableKey.startsWith("us-tax-terms:city.") ||
              row.stableKey.startsWith("us-tax-terms:county."),
          )
          .map((row) => row.stableKey),
        ...world.policyCatalog.propositionOrder
          .map((id) => world.policyCatalog.propositions[id]!)
          .filter((row) =>
            row.tags?.some(
              (tag) => tag.includes("tax") || tag.includes("appropriation"),
            ),
          )
          .slice(0, 30)
          .map((row) => row.stableKey),
      ];
      for (const key of keys)
        for (const route of ["draft", "typed-proposal"] as const)
          expect(
            localFiscalAuthorityFor(fiscal, government.key, key, route),
          ).toEqual(
            nativeFiscal.localFiscalAuthorityFor(
              world,
              government.key,
              key,
              route,
            ),
          );
      expect(
        admitLocalFiscalMeasure(fiscal, government.key, "missing" as EntityId),
      ).toEqual(
        nativeFiscal.admitLocalFiscalMeasure(
          world,
          government.key,
          "missing" as EntityId,
        ),
      );
    },
    30000,
  );
});
