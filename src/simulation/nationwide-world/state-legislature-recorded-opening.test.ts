import { describe, expect, it } from "vitest";
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
});
