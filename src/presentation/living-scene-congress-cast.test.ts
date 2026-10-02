import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { ARTICLE_V_STATE_KEYS } from "../simulation/constitutional-process";
import { SeededRng } from "../simulation/rng";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { recordedDistrictMembership } from "../simulation/district-residence";
import { personName } from "../simulation/people";
import { projectWorldOrientation } from "./world-orientation-contract";
import { projectLivingSceneOpening } from "./living-scene-facts";

const seed = "living scene actual home senators five jurisdictions";
const all = lifePlaceStateIdentities();
const eligible = all.filter((state) =>
  ARTICLE_V_STATE_KEYS.includes(state.jurisdictionKey),
);
const rng = new SeededRng(seed).fork("eligible saved Senate states");
const states = Array.from(
  { length: 5 },
  () => eligible.splice(rng.integer(0, eligible.length), 1)[0]!,
);

describe("living scene Congress cast uses every actual home senator", () => {
  it.each(states)(
    "keeps actual saved members and their records in $jurisdictionKey",
    (state) => {
      expect(all).toHaveLength(56);
      const game = smallWorld({
        place: state.jurisdictionKey,
        seed: `${seed}:${state.jurisdictionKey}`,
        offices: ["congress"],
      });
      const world = game.world;
      if (world.control.kind !== "person")
        throw Error("Actual controlled person required.");
      const playerId = world.control.personId;
      const saved = serializeWorld(world);
      const orientation = projectWorldOrientation(world, playerId);
      const senate = orientation.congress!.senate;
      const house = orientation.congress!.house;
      const homeUsps = state.jurisdictionKey.slice(3);
      const senators = senate.seats.filter(
        (seat) => seat.stateUsps === homeUsps,
      );
      expect(senators).toHaveLength(2);
      const opening = projectLivingSceneOpening(world, playerId);
      const actors = opening.chapters.find(
        (chapter) => chapter.key === "congress",
      )!.actors;
      for (const seat of senators) {
        expect(seat.occupant.kind).toBe("member");
        if (seat.occupant.kind !== "member")
          throw Error("Saved seated senator required.");
        const holder = seat.occupant.member;
        const matched = actors.filter(
          (actor) => actor.slotKey === `congress:${seat.seatKey}`,
        );
        expect(matched).toHaveLength(1);
        expect(
          actors.filter((actor) => actor.person.personId === holder.personId),
        ).toHaveLength(1);
        expect(matched[0]!.person).toMatchObject({
          personId: holder.personId,
          name: personName(world.people[holder.personId]!),
        });
        expect(matched[0]!.recordIds).toEqual([
          holder.termId,
          senate.organizationId,
        ]);
        expect(matched[0]!.provenance).toMatchObject({
          kind: "legislative-seat",
          institutionId: senate.organizationId,
          roleKey: holder.officeKey,
        });
        expect(matched[0]!.publicTenure).toEqual({
          startedAt: holder.startedAt,
          endExclusive: holder.endExclusive,
        });
      }
      const binding = recordedDistrictMembership(
        world,
        playerId,
        "congressional",
        world.currentDate,
      )?.binding;
      const homeHouse = house.seats.filter(
        (seat) => seat.stateUsps === homeUsps,
      );
      // The independent roster oracle admits a single actual district match;
      // without a binding, only the state's sole at-large seat is supported.
      const selectedHouse = binding
        ? homeHouse.find(
            (seat) =>
              seat.stateUsps === binding.stateUsps &&
              seat.district === binding.geoid.slice(2),
          )
        : homeHouse.length === 1 && homeHouse[0]!.district === "00"
          ? homeHouse[0]
          : undefined;
      const houseActors = actors.filter((actor) =>
        house.seats.some(
          (seat) => actor.slotKey === `congress:${seat.seatKey}`,
        ),
      );
      expect(houseActors).toHaveLength(
        selectedHouse?.occupant.kind === "member" ? 1 : 0,
      );
      if (selectedHouse?.occupant.kind === "member") {
        expect(houseActors[0]!.person.personId).toBe(
          selectedHouse.occupant.member.personId,
        );
        expect(houseActors[0]!.recordIds).toEqual([
          selectedHouse.occupant.member.termId,
          house.organizationId,
        ]);
      }
      if (!binding && homeHouse.length > 1) expect(houseActors).toEqual([]);
      expect(projectLivingSceneOpening(world, playerId)).toEqual(opening);
      expect(serializeWorld(world)).toBe(saved);
      const continued = deserializeWorld(saved);
      expect(projectWorldOrientation(continued, playerId)).toEqual(orientation);
      expect(projectLivingSceneOpening(continued, playerId)).toEqual(opening);
      expect(serializeWorld(continued)).toBe(saved);
      console.info(
        "living scene saved Congress cast",
        JSON.stringify({
          seed,
          state: state.jurisdictionKey,
          senators: senators.map((seat) =>
            seat.occupant.kind === "member"
              ? {
                  name: personName(
                    world.people[seat.occupant.member.personId]!,
                  ),
                  personId: seat.occupant.member.personId,
                  termId: seat.occupant.member.termId,
                }
              : null,
          ),
          boundHouse: Boolean(binding),
          houseActors: houseActors.length,
        }),
      );
    },
  );
});
