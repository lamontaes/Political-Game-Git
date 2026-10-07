import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import {
  syncDistrictMembershipFromCanonicalHome,
  recordedDistrictMembership,
  canonicalHomeDistrictCandidates,
} from "../simulation/district-residence";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { openingLegislaturePeople } from "../presentation/opening-tour-people";
import { projectGovernmentBrowser } from "../presentation/politics-government";
import { personName } from "../simulation/people";
import { SavedPersonFigure } from "./SavedPersonFigure";

const seed = "opening state representatives ordinary canonical homes";
const identities = [...lifePlaceStateIdentities()];
const rng = new SeededRng(seed).fork("all 56 jurisdictions");
const states = Array.from(
  { length: 5 },
  () => identities.splice(rng.integer(0, identities.length), 1)[0]!,
);

describe("opening state representatives use only actual public home bindings", () => {
  it.each(states)(
    "reads actual representatives in $jurisdictionKey",
    (state) => {
      expect(lifePlaceStateIdentities()).toHaveLength(56);
      const game = smallWorld({
        place: state.jurisdictionKey,
        seed: `${seed}:${state.jurisdictionKey}`,
        offices: ["governor", "state-legislature"],
      });
      const playerId = game.personId;
      // The existing writer admits only an exact canonical-home source join.
      // No district selection or supplied representative is added to this world.
      const world = syncDistrictMembershipFromCanonicalHome(
        game.world,
        playerId,
      );
      const saved = serializeWorld(world);
      const browser = projectGovernmentBrowser(world, playerId, {
        scope: "state",
      });
      const represented = (browser.representedBy ?? []).filter((row) =>
        row.key.startsWith("state:"),
      );
      const expected = represented.flatMap((row) =>
        row.holders.flatMap((holder) =>
          holder.status === "member" &&
          holder.personId &&
          holder.name &&
          world.people[holder.personId]
            ? [{ row, holder }]
            : [],
        ),
      );
      const people = openingLegislaturePeople(world, playerId);
      expect(people.map((person) => person.personId)).toEqual(
        expected.map(({ holder }) => holder.personId),
      );
      for (const [index, person] of people.entries()) {
        const { row, holder } = expected[index]!;
        expect(person.name).toBe(holder.name);
        expect(person.name).toBe(personName(world.people[person.personId]!));
        expect(person.title).toBe(
          row.district
            ? `${row.office.replace(/^House of (?:Delegates|Representatives)$/, "House")}, ${row.district.replace(/^State (?:House |Senate |Legislative )?/, "")}`
            : row.office,
        );
        // This existing public projection supplies no holder party: avoid
        // introducing an affiliation inferred from the chamber's majority.
        expect(person.party).toBeNull();
        const markup = renderToStaticMarkup(
          <SavedPersonFigure
            world={world}
            personId={person.personId}
            wear="formal"
          />,
        );
        expect(markup).toContain(`data-person-id="${person.personId}"`);
        expect(markup).toContain(person.name);
      }
      const bindings = ["state-upper", "state-lower"].map((chamber) => ({
        chamber,
        binding:
          recordedDistrictMembership(
            world,
            playerId,
            chamber as "state-upper" | "state-lower",
            world.currentDate,
          )?.binding ?? null,
        candidates: canonicalHomeDistrictCandidates(
          world,
          playerId,
          chamber as "state-upper" | "state-lower",
        ),
      }));
      if (bindings.every((entry) => entry.binding === null))
        expect(people).toEqual([]);
      expect(openingLegislaturePeople(world, playerId)).toEqual(people);
      expect(serializeWorld(world)).toBe(saved);
      const continued = deserializeWorld(saved);
      expect(
        projectGovernmentBrowser(continued, playerId, { scope: "state" }),
      ).toEqual(browser);
      expect(openingLegislaturePeople(continued, playerId)).toEqual(people);
      expect(serializeWorld(continued)).toBe(saved);
      console.info(
        "opening state representative source evidence",
        JSON.stringify({
          seed,
          state: state.jurisdictionKey,
          place: game.place.displayName,
          bindings: bindings.map((entry) => ({
            chamber: entry.chamber,
            recordId: entry.binding?.recordId ?? null,
            candidates: entry.candidates.length,
          })),
          people: people.map((person) => ({
            personId: person.personId,
            name: person.name,
            title: person.title,
          })),
          ordinaryData: people.length
            ? "actual public representatives observed"
            : "TODO: ordinary canonical home has no admitted public representative; none invented",
        }),
      );
    },
  );
});
