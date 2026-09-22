import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { drawCanonicalName } from "../people";
import { GIVEN_NAME_GENERATION_POOLS_V1 } from "../names-data";
import { SeededRng } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { projectCongress } from "./congress";
import { ensureLivingWorldOpening, LIVING_WORLD_OPENING_KEY } from "./opening";

const seed = "playtest65-o-gap-audit";
let base: World;
let legacy: World;
let current: World;
let subject: EntityId;
const members = (world: World) => {
  const congress = projectCongress(world)!;
  return [...congress.house.seats, ...congress.senate.seats].flatMap((seat) =>
    seat.occupant.kind === "member"
      ? [
          {
            seatKey: seat.seatKey,
            person: world.people[seat.occupant.member.personId]!,
          },
        ]
      : [],
  );
};
beforeAll(() => {
  base = createDemoWorld(seed);
  subject = base.personOrder[0]!;
  legacy = ensureLivingWorldOpening(base, subject);
  current = ensureLivingWorldOpening(base, subject, "identity-v1");
});
describe("versioned legislative member names", () => {
  it("preserves the exact pre-repair legacy replay and unrestricted name draws", () => {
    expect(
      createHash("sha256").update(serializeWorld(legacy)).digest("hex"),
    ).toBe("31d0efa0a24a23da5a7acd96fd77446848ac0f03a2f9547aa3fa8a89b16f537e");
    for (const { seatKey, person } of members(legacy)) {
      const name = drawCanonicalName(
        new SeededRng(seed)
          .fork(LIVING_WORLD_OPENING_KEY)
          .fork(`seat:${seatKey}`)
          .fork("name"),
      );
      expect({
        givenName: person.givenName,
        familyName: person.familyName,
      }).toEqual(name);
    }
  });
  it("uses existing identity pools while preserving every non-name person fact and participation", () => {
    const oldMembers = members(legacy);
    const newMembers = members(current);
    expect(newMembers.map((x) => x.person.id)).toEqual(
      oldMembers.map((x) => x.person.id),
    );
    let changed = 0;
    for (const { person } of newMembers) {
      const old = legacy.people[person.id]!;
      const { givenName, establishedFacts, ...stable } = person;
      const {
        givenName: oldName,
        establishedFacts: oldFacts,
        ...oldStable
      } = old;
      expect(stable).toEqual(oldStable);
      expect(
        establishedFacts.map((fact) => ({ ...fact, summary: "" })),
      ).toEqual(oldFacts.map((fact) => ({ ...fact, summary: "" })));
      const gender = person.identity!.gender;
      if (gender !== "unstated")
        expect(
          GIVEN_NAME_GENERATION_POOLS_V1[
            gender === "male"
              ? "male"
              : gender === "female"
                ? "female"
                : "neutral"
          ],
        ).toContain(givenName);
      else expect(givenName).toBe(oldName);
      if (givenName !== oldName) changed += 1;
    }
    expect(changed).toBeGreaterThan(0);
    expect(current.history.organizationParticipations).toEqual(
      legacy.history.organizationParticipations,
    );
    expect(current.history.organizationParticipationStates).toEqual(
      legacy.history.organizationParticipationStates,
    );
    for (const id of base.personOrder)
      expect(current.people[id]).toEqual(base.people[id]);
    const old = oldMembers.find((x) => x.seatKey === "us-house:AR-03")!.person;
    const fixed = newMembers.find(
      (x) => x.seatKey === "us-house:AR-03",
    )!.person;
    expect([old.givenName, fixed.givenName, fixed.familyName]).toEqual([
      "Allison",
      "Christopher",
      "Roach",
    ]);
    expect(fixed.identity).toEqual({ gender: "male", pronouns: "he-him" });
  });
  it("never renames stored people and preserves the completed save on reload", () => {
    for (const world of [legacy, current]) {
      const payload = serializeWorld(world);
      const restored = deserializeWorld(payload);
      expect(ensureLivingWorldOpening(restored, subject, "identity-v1")).toBe(
        restored,
      );
      expect(ensureLivingWorldOpening(restored, subject)).toBe(restored);
      expect(serializeWorld(restored)).toBe(payload);
    }
    expect(
      serializeWorld(ensureLivingWorldOpening(base, subject, "identity-v1")),
    ).toBe(serializeWorld(current));
  });
});
