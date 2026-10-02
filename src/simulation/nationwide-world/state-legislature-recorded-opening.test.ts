import { describe, expect, it } from "vitest";
import resultSource from "../../../data/research/elections/state-legislative-district-results.json" with { type: "json" };
import { stateCandidacyPack } from "../candidacy-packs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import { createOrganization } from "../life";
import { LIVING_WORLD_KEYS } from "../living-world/opening";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { appendWorldConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import {
  ensureStateLegislatureOpening,
  planStateChambers,
  stateLegislators,
} from "./state-legislature-opening";

const seed = "overflow3:a115:certified-opening:1";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;

describe("state legislative opening requires its own district evidence", () => {
  it("seats real members without borrowing congressional margins or assigning chamber frequencies", () => {
    expect(places).toHaveLength(56);
    const { world: initial } = smallWorld({
      place: place.usps,
      seed,
      people: 3,
    });
    const subject = initial.personOrder[0]!;
    let withParties = initial;
    for (const party of ["democratic", "republican"] as const) {
      withParties = createOrganization(withParties, {
        stableKey: LIVING_WORLD_KEYS.nationalParty(party),
        formedAt: makeIsoDate("1900-01-01"),
        provenance: { kind: "authored", note: "A115 recorded party control" },
        initialProfile: {
          name: party,
          classification: "membership:political-party",
          locationJurisdictionId: null,
        },
      });
    }
    const political = generatePoliticalStartingConditions(
      withParties,
      "near-reference",
    );
    const source = appendWorldConditions(withParties, [political]);
    const saved = ensureStateLegislatureOpening(source, subject, place.usps);
    const event = saved.history.events.find(
      (row) => row.type === "world.state-legislature-opening",
    );
    expect(event, `${place.usps}; seed ${seed}`).toBeDefined();
    const pack = event!.tags.find((tag) => tag.startsWith("pack:"))!.slice(5);
    const members = stateLegislators(saved, pack);
    expect(members.length).toBeGreaterThan(0);
    expect(members.every((member) => member.party === null)).toBe(true);
    expect(event!.tags.some((tag) => tag.startsWith("seat-share:"))).toBe(
      false,
    );
    expect(event!.tags).toContain(
      "PLACEHOLDER:state-legislative-district-results",
    );
    const reopened = deserializeWorld(serializeWorld(saved));
    expect(ensureStateLegislatureOpening(reopened, subject, place.usps)).toBe(
      reopened,
    );
    expect(stateLegislators(reopened, pack)).toEqual(members);
  });

  it("seats actual parties for every primary-certified current-boundary seat and preserves them on reload", () => {
    const primaryStates = [
      ...new Set(resultSource.primarySources.map((source) => source.stateUsps)),
    ];
    for (const state of primaryStates) {
      const proofSeed = `${seed}:primary:${state}`;
      const { world: saved } = smallWorld({
        place: state,
        seed: proofSeed,
        people: 3,
        offices: ["state-legislature"],
      });
      const pack = stateCandidacyPack(`US-${state}`)!;
      const chambers = planStateChambers(pack).chambers;
      const members = stateLegislators(saved, pack.packId);
      const bindings = resultSource.bindings.filter((binding) =>
        resultSource.records.some(
          (record) =>
            record.key === binding.sourceSeatKey && record.stateUsps === state,
        ),
      );
      let verified = 0;
      for (const member of members) {
        const chamber = chambers.find(
          (candidate) => candidate.officeKey === member.officeKey,
        )!;
        const identity = chamber.districts[member.ordinal - 1];
        const binding = bindings.find(
          (candidate) => candidate.districtRecordId === identity?.recordId,
        );
        if (!binding) continue;
        const record = resultSource.records.find(
          (candidate) => candidate.key === binding.sourceSeatKey,
        )!;
        const winner = record.winners[0]!;
        expect(member.party, `${identity!.recordId}; seed ${proofSeed}`).toBe(
          winner.partyCode === "d" ? "democratic" : "republican",
        );
        const event = saved.history.events.find(
          (candidate) => candidate.type === "world.state-legislature-opening",
        )!;
        expect(event.tags).toContain(
          `seat-result:${member.officeKey}|${member.ordinal}|${winner.caseIds[0]}`,
        );
        verified += 1;
      }
      expect(verified).toBe(bindings.length);
      expect(verified).toBeGreaterThan(0);
      const reopened = deserializeWorld(serializeWorld(saved));
      expect(stateLegislators(reopened, pack.packId)).toEqual(members);
      expect(
        ensureStateLegislatureOpening(
          reopened,
          reopened.personOrder[0]!,
          state,
        ),
      ).toBe(reopened);
    }
  });
});
