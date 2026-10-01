import { scheduleFutureDueItem } from "../future-transitions";
import { PRESS_DESK_SWEEP_TRANSITION_KEY } from "./desk";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createLightweightPerson } from "../people";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import {
  createWorld,
  createWorldId,
  advanceWorld,
  recordWorldEvent,
} from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  createPressTransitionRegistry,
  ensurePressOpening,
} from "./transitions";
import { mediaOutlets, reporterRoles } from "./outlets";

const places = ["4752006", "3918000", "1150000", "1571550", "2836000"];
// Measured pre-removal current-main f7e37901 parity; no output levels authored.
const BASELINE_HASHES: Readonly<Record<string, string>> = {
  "4752006": "c53bdbd8af0c0afa90b357900881b37007caad2655bf16fb6409d30f940040bc",
  "3918000": "61b3ce26e39f847175ba6e3f869da49362dc6084acbbefab6701f93c66fb1203",
  "1150000": "3d747520f45310836179b1a121a0ef54eb263812af5ed027676c6ffd46086ac5",
  "1571550": "e0826813b3b1bc8f6d21352efa1cba219ef4e234bdc73baf258ed47081ac6f53",
  "2836000": "16ea9d6795145761ec680fb1e97430d10dcfa5735a8754d26ce50b064ac90595",
};
describe("weekly press reads existing newsroom records", () => {
  it.each(places)(
    "preserves the seeded existing-record result in %s",
    (placeKey) => {
      const place = requireLifePlace(placeKey);
      const seed = `team8-n3-weekly:${placeKey}`;
      const date = makeIsoDate("2026-01-05");
      const person = createLightweightPerson({
        worldId: createWorldId(seed),
        worldSeed: seed,
        index: 0,
        currentDate: date,
        homeJurisdictionId: place.context.jurisdiction.id,
      });
      let world = createWorld({
        seed,
        currentDate: date,
        jurisdictions: [place.context.jurisdiction],
        people: [person],
      });
      world = { ...world, control: { kind: "person", personId: person.id } };
      world = ensurePressOpening(world, person.id);
      const existingOutlets = mediaOutlets(world).map((row) => row.id);
      const existingReporters = reporterRoles(world).map((row) => row.personId);
      const next = advanceWorld(world, 7, createPressTransitionRegistry());
      expect(mediaOutlets(next).map((row) => row.id)).toEqual(existingOutlets);
      expect(reporterRoles(next).map((row) => row.personId)).toEqual(
        existingReporters,
      );
      const payload = serializeWorld(next);
      const hash = createHash("sha256").update(payload).digest("hex");
      expect(hash).toBe(BASELINE_HASHES[placeKey]);
      expect(serializeWorld(deserializeWorld(payload))).toBe(payload);
    },
    30000,
  );
  it.each(places)(
    "withholds missing home/exposure coverage instead of creating people in %s",
    (placeKey) => {
      const place = requireLifePlace(placeKey);
      const foreign = stateJurisdictionForKey("US-AL")!;
      const seed = `team8-n3-missing:${placeKey}`;
      const date = makeIsoDate("2026-01-05");
      const person = createLightweightPerson({
        worldId: createWorldId(seed),
        worldSeed: seed,
        index: 0,
        currentDate: date,
        homeJurisdictionId: place.context.jurisdiction.id,
      });
      let world = createWorld({
        seed,
        currentDate: date,
        jurisdictions: [place.context.jurisdiction, foreign],
        people: [person],
      });
      world = { ...world, control: { kind: "person", personId: person.id } };
      world = recordWorldEvent(world, {
        stableKey: "fixture:recorded-exposure",
        type: "fixture.public-exposure",
        occurredAt: date,
        recordedAt: date,
        jurisdictionId: foreign.id,
        involvedEntityIds: [person.id],
        participants: [
          { personId: person.id, role: "agency:actor", detail: null },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: ["fixture:authored-exposure"],
        summary: "Recorded public participation fixture.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      world = scheduleFutureDueItem(world, {
        stableKey: "press46:desk-sweep:0",
        dueAt: makeIsoDate("2026-01-12"),
        transitionKey: PRESS_DESK_SWEEP_TRANSITION_KEY,
        entityIds: [world.id],
        jurisdictionId: null,
        provenance: {
          kind: "initialization",
          reference:
            "Recorded weekly sweep fixture without an opening newsroom",
        },
      });
      const beforePeople = world.personOrder;
      const beforeOrganizations = world.history.organizations;
      const next = advanceWorld(world, 7, createPressTransitionRegistry());
      expect(mediaOutlets(next)).toEqual([]);
      expect(reporterRoles(next)).toEqual([]);
      expect(next.personOrder).toEqual(beforePeople);
      expect(next.history.organizations).toEqual(beforeOrganizations);
      const resumed = deserializeWorld(serializeWorld(next));
      const repeated = advanceWorld(
        resumed,
        7,
        createPressTransitionRegistry(),
      );
      expect(mediaOutlets(repeated)).toEqual([]);
      expect(repeated.personOrder).toEqual(beforePeople);
      expect(repeated.history.organizations).toEqual(beforeOrganizations);
    },
  );
});
