import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import vetoTable from "../../../data/research/laws/veto-windows-2023.json";
import seatsTable from "../../../data/research/laws/legislators-2023.json";
import ratificationTable from "../../../data/research/legislature/federal-amendment-ratification-rules-2026.json";
import { STATES } from "../../simulation/state-reference";
import { LEGISLATIVE_RULE_PACKS } from "../../simulation/legislature-rule-packs";
import { VETO_OVERRIDE_SOURCE_READINGS } from "../../simulation/veto-override-source-readings";
import * as native from "../../simulation/legislature-game-profile";
import * as nativeRatification from "../../simulation/constitutional-ratification-rules";
import { standingCommittee as nativeCommittee } from "../../simulation/standing-committee";
import { districtIdentityCatalog } from "../../districts/catalog";
import { listDistrictIdentities } from "../../districts/query";
import { seatsByDistrict } from "../../districts/members-per-district";
import * as rules from "./profile";
import * as ratification from "./ratification";
import { standingCommittee } from "./standing-committee";
/** Reads only unchanged private DATA constants, never a rule result. Native public callers remain the oracles. */
function sourceConstant<T>(name: string): T {
  const file = readFileSync(
    new URL("../../simulation/legislature-game-profile.ts", import.meta.url),
    "utf8",
  );
  const ast = ts.createSourceFile(
    "native.ts",
    file,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = ast.statements
    .flatMap((node) =>
      ts.isVariableStatement(node)
        ? [...node.declarationList.declarations]
        : [],
    )
    .find((node) => node.name.getText(ast) === name)!;
  const js = ts.transpileModule(
    `const value=${declaration.initializer!.getText(ast)};`,
    { compilerOptions: { target: ts.ScriptTarget.ESNext } },
  ).outputText;
  return new Function("legislatorsTable", js + "return value;")(
    seatsTable,
  ) as T;
}
const noStateLegislature = sourceConstant<
  rules.LegislatureProfileFacts["noStateLegislature"]
>("NO_STATE_LEGISLATURE");
const settledSeats = sourceConstant<
  rules.LegislatureProfileFacts["settledSeats"]
>("SETTLED_CHAMBER_SEATS");
const chamberSource = sourceConstant<
  rules.LegislatureProfileFacts["chamberSource"]
>("CHAMBER_SEATS_SOURCE");
describe("legislatures: private profile helpers through unchanged public callers", () => {
  it.each(Object.keys(STATES))(
    "matches profile, seats, veto and ratification for %s",
    (place) => {
      const key = `US-${place}`;
      const count = (chamber: "state-lower" | "state-upper") =>
        seatsByDistrict(
          listDistrictIdentities(districtIdentityCatalog(), {
            stateUsps: place,
            chamber,
          }),
        ).length;
      const facts: rules.LegislatureProfileFacts = {
        researchedPacks: LEGISLATIVE_RULE_PACKS,
        vetoRows: vetoTable.rows,
        seatRows: seatsTable.rows,
        overrideReadings: VETO_OVERRIDE_SOURCE_READINGS,
        noStateLegislature,
        settledSeats,
        districtSeats: {
          lower: count("state-lower"),
          upper: count("state-upper"),
        },
        chamberSource,
        vetoSourceCitation: native.VETO_WINDOW_SOURCE.citation,
        version: native.LEGISLATURE_GAME_PROFILE_VERSION,
      };
      expect(rules.buildLegislatureProfile(facts, key)).toEqual(
        native.legislatureProfileFor(key),
      );
      expect(rules.researchedChamberSpread(facts)).toEqual(
        native.researchedChamberSpread(),
      );
      expect(rules.researchedExecutiveSpread(facts)).toEqual(
        native.researchedExecutiveSpread(),
      );
      expect(rules.vetoWindowFor(facts, key)).toEqual(
        native.vetoWindowFor(key),
      );
      for (const after of [false, true])
        expect(rules.vetoWindowDayBasisFor(facts, key, after)).toEqual(
          native.vetoWindowDayBasisFor(key, after),
        );
      for (const fraction of [
        [1, 2],
        [2, 3],
        [3, 5],
      ] as const)
        expect(rules.overrideThresholdFor(facts, key, fraction)).toEqual(
          native.overrideThresholdFor(key, fraction),
        );
      const pack = native.legislatureForState(key);
      if (pack)
        for (const chamber of pack.chambers) {
          expect(
            rules.seatsForChamber(facts, pack, chamber.chamberKey),
          ).toEqual(native.seatsForChamber(pack, chamber.chamberKey));
          for (const size of [null, 0, 7, 70, 400])
            expect(
              standingCommittee(chamber.chamberKey, size, STATES[place]!.name),
            ).toEqual(
              nativeCommittee(chamber.chamberKey, size, STATES[place]!.name),
            );
        }
      expect(
        ratification.stateRatificationChambers(ratificationTable.rows, key),
      ).toEqual(nativeRatification.stateRatificationChambers(key));
      for (const chamber of ["house", "senate", "unicameral", "missing"])
        expect(
          ratification.stateRatificationRule(
            ratificationTable.rows,
            key,
            chamber,
          ),
        ).toEqual(nativeRatification.stateRatificationRule(key, chamber));
    },
  );
});
