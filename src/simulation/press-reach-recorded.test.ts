import { appendFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { recordedCivicReporterFixture } from "../../tests/support/recorded-civic-journalist";
import {
  createCharacterHistoryContextPerson,
  characterHistoryContextPersonId,
} from "./character-history";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { stateJurisdictionForKey } from "./life-places";
import { personName } from "./people";
import { seekCivicPressContact } from "./press-reach";
import { deserializeWorld, serializeWorld } from "./serialization";
import { STATES } from "./state-reference";
import { createWorld } from "./world";
const seed = "team8-a153-existing-reporter-all56";
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
describe("existing recorded reporter lookup parity", () => {
  it.each(places)(
    "reads the same saved role without mutation in %s",
    (usps) => {
      let world = createWorld({
        seed: `${seed}:${usps}`,
        currentDate: makeIsoDate("2026-01-02"),
        jurisdictions: [stateJurisdictionForKey(`US-${usps}`)!],
        people: [],
      });
      world = createCharacterHistoryContextPerson(world, {
        stableKey: "controlled-source",
        givenName: "Alex",
        familyName: "Reed",
        birthDate: makeIsoDate("1992-01-02"),
        homeJurisdictionId: world.jurisdictionOrder[0]!,
      });
      world = {
        ...world,
        control: {
          kind: "person",
          personId: characterHistoryContextPersonId(world, "controlled-source"),
        },
      };
      const recorded = recordedCivicReporterFixture(world);
      const before = serializeWorld(recorded.world);
      const contact = seekCivicPressContact(recorded.world);
      expect(contact.world).toBe(recorded.world);
      expect(contact.reporterPersonId).toBe(recorded.reporterPersonId);
      expect(contact.reporterWorkRoleId).toBe(recorded.reporterWorkRoleId);
      expect(contact.organizationId).toBe(recorded.organizationId);
      expect(contact.established).toBe(false);
      expect(serializeWorld(contact.world)).toBe(before);
      const loaded = deserializeWorld(before),
        repeated = seekCivicPressContact(loaded);
      expect(repeated.world).toBe(loaded);
      expect(repeated.reporterPersonId).toBe(contact.reporterPersonId);
      expect(repeated.reporterWorkRoleId).toBe(contact.reporterWorkRoleId);
      expect(serializeWorld(repeated.world)).toBe(before);
      mkdirSync("test-results/team8", { recursive: true });
      const phase = process.env.TEAM8_A153_PROOF_PHASE ?? "candidate";
      if (!["baseline", "candidate"].includes(phase))
        throw new Error("Unknown receipt phase.");
      appendFileSync(
        `test-results/team8/a153-existing-reporter-${phase}.jsonl`,
        JSON.stringify({
          usps,
          seed: world.seed,
          name: personName(recorded.world.people[recorded.reporterPersonId]!),
          personId: recorded.reporterPersonId,
          roleId: recorded.reporterWorkRoleId,
          beforeSha256: sha(before),
          afterSha256: sha(serializeWorld(contact.world)),
          reloadSha256: sha(serializeWorld(repeated.world)),
        }) + "\n",
      );
    },
  );
});
