/**
 * The municipal recall rule reader carries its state pack's citation, and in a
 * state whose recall turns on a form or charter a town takes the doctrine
 * state law gives it until it adopts one, as an unverified state-law basis.
 * (The assertions main added to the old-versus-new parity test, kept here
 * when that test went with the old engine's copies.)
 */
import { expect, it } from "vitest";
import { corePlaceStateIdentities } from "../place-lookup";
import * as ballot from "./municipal-ballot-rules";
import { municipalRulePackFor } from "./municipal-election-rule-packs";

const DOCTRINES = [
  null,
  "two-question-standalone",
  "simultaneous-incumbent-replacement",
  "yes-no-retention",
  "judicial-cause-removal-trial",
  "prohibited",
] as const;

it("every state's recall rule names its pack's citation, and a form-dependent state defaults a town to the doctrine state law gives it", () => {
  let defaulted = 0;
  let adopted = 0;
  for (const state of corePlaceStateIdentities()) {
    const pack = municipalRulePackFor(state.usps);
    const statutory =
      pack?.recallDoctrine.kind === "locally-selectable"
        ? pack.recallDoctrine.statutoryDefault
        : null;
    for (const usps of [state.usps, state.usps.toLowerCase()])
      for (const doctrine of DOCTRINES) {
        const now = ballot.resolveMunicipalRecallRule(usps, doctrine);
        expect(now.citation, `${usps} ${doctrine}`).toBe(
          pack?.recallCitation ?? null,
        );
        if (doctrine === null && statutory !== null) {
          defaulted += 1;
          expect(now.doctrine, usps).toBe(statutory);
          expect(now.doctrineBasis, usps).toBe("state-law-unverified");
        } else if (
          doctrine !== null &&
          pack?.recallDoctrine.kind === "locally-selectable"
        ) {
          adopted += 1;
          expect(now.doctrine, `${usps} ${doctrine}`).toBe(doctrine);
        }
      }
  }
  // Wyoming's commission-form recall, among others, defaults a town to none.
  expect(defaulted).toBeGreaterThan(0);
  expect(adopted).toBeGreaterThan(0);
});
