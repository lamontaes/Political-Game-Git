/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import {
  activeWorkRelationshipsAt,
  createWorkRelationship,
  deserializeWorld,
  lifePlaceStateIdentities,
  recordPersonDeath,
  searchLifePlaces,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { recordOpeningWorkLocation } from "./opening-work-location";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import {
  backdropForLocation,
  selectedWorkplaceForPerson,
} from "./place-backdrops";
import { placeBackdropPeople } from "./backdrop-people";
import { campusRecords } from "./campus-backdrops";
import { SceneBackdrop } from "../player/SceneBackdrop";

const seed = "team9-workplace-identity";
const places = lifePlaceStateIdentities();
const drawn =
  places[
    Array.from(seed).reduce(
      (value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0,
      0,
    ) % places.length
  ]!;
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: drawn.jurisdictionKey,
  scope: "locality",
})[0]!;

describe("selected workplace identity", { timeout: 60_000 }, () => {
  let world: World;
  let generatedWorld: World;
  let viewer: EntityId;
  let colleague: EntityId;
  let outsider: EntityId;
  let secondWorkId: EntityId;
  beforeAll(() => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startKind: "custom",
        startAge: 34,
        questionnaire: "skipped",
      }),
    ).game!;
    const partyJobs = game.world.history.workRelationships.filter(
      (job) => job.kind === "employment:party-staff",
    );
    expect(partyJobs.length).toBeGreaterThanOrEqual(2);
    const selected = partyJobs[0]!;
    viewer = selected.personId;
    outsider = partyJobs.find(
      (job) => job.organizationId !== selected.organizationId,
    )!.personId;
    world = {
      ...game.world,
      control: { kind: "person", personId: viewer },
      currentMoment: { ...game.world.currentMoment, minuteOfDay: 10 * 60 },
    };
    world = recordOpeningWorkLocation(world, viewer);
    expect(selectedWorkplaceForPerson(world, viewer)?.workRelationshipId).toBe(
      selected.id,
    );
    const role = activeWorkRelationshipsAt(world, viewer).find(
      (job) => job.relationship.id === selected.id,
    )!.role;
    const otherJob = world.history.workRelationships.find(
      (job) =>
        job.organizationId && job.organizationId !== selected.organizationId,
    )!;
    world = createWorkRelationship(world, {
      stableKey: `${seed}:second-job`,
      personId: viewer,
      organizationId: otherJob.organizationId,
      startedAt: world.currentDate,
      kind: "employment:workplace-fixture",
      compensation: selected.compensation,
      authority: selected.authority,
      dependency: selected.dependency,
      economicRisk: selected.economicRisk,
      provenance: {
        kind: "authored",
        note: "Second active job negative case.",
      },
      initialRole: {
        title: "Second job",
        occupationClassification: "occupation:office-manager",
        locationJurisdictionId: role.locationJurisdictionId,
        timeDemand: role.timeDemand,
      },
    });
    secondWorkId = world.history.workRelationships.at(-1)!.id;
    generatedWorld = world;
    colleague = world.personOrder.find(
      (id) =>
        id !== viewer &&
        id !== outsider &&
        activeWorkRelationshipsAt(world, id).length === 0 &&
        world.people[id]!.birthDate <= "2000-01-01",
    )!;
    expect(colleague).toBeDefined();
    world = createWorkRelationship(world, {
      stableKey: `${seed}:same-employer-worker`,
      personId: colleague,
      organizationId: selected.organizationId,
      startedAt: world.currentDate,
      kind: "employment:party-staff",
      compensation: selected.compensation,
      authority: selected.authority,
      dependency: selected.dependency,
      economicRisk: selected.economicRisk,
      provenance: {
        kind: "authored",
        note: "Positive roster fixture; the generated employer has only one worker.",
      },
      initialRole: {
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: role.locationJurisdictionId,
        timeDemand: role.timeDemand,
      },
    });
    if (process.env.OCD_WORKPLACE_PROOF_DIR)
      writeFileSync(
        `${process.env.OCD_WORKPLACE_PROOF_DIR}/world.json`,
        JSON.stringify({
          serialized: serializeWorld(world),
          generatedSerialized: serializeWorld(generatedWorld),
          viewer,
          colleague,
          outsider,
          seed,
          placeKey: place.key,
          state: drawn.usps,
        }),
      );
  });

  it("checks exact campus identity and recorded location through the room picker (edge fixture)", () => {
    const record =
      campusRecords()[
        Array.from(seed).reduce((n, c) => n + c.charCodeAt(0), 0) %
          campusRecords().length
      ]!;
    const campusPlace = searchLifePlaces("", 1, {
      stateJurisdictionKey: `US-${record.state.toUpperCase()}`,
      scope: "locality",
    })[0]!;
    const selected = selectedWorkplaceForPerson(world, viewer)!;
    // Explicit identity/location edge fixture; not generated college attendance evidence.
    const fixture: World = {
      ...world,
      history: {
        ...world.history,
        organizationProfiles: world.history.organizationProfiles.map(
          (profile) =>
            profile.organizationId === selected.organizationId
              ? {
                  ...profile,
                  name: record.name,
                  locationJurisdictionId: campusPlace.context.jurisdiction.id,
                }
              : profile,
        ),
        events: world.history.events.map((event) =>
          event.id === selected.arrivalId
            ? {
                ...event,
                tags: event.tags.map((tag) =>
                  tag.startsWith("place:") ? "place:college-quad" : tag,
                ),
              }
            : event,
        ),
      },
    };
    const key = resolveOpeningPlaySceneContext(fixture, viewer).locationKey;
    expect(backdropForLocation(fixture, viewer, key)?.url).toContain(
      record.file,
    );
    const unknown: World = {
      ...fixture,
      history: {
        ...fixture.history,
        organizationProfiles: fixture.history.organizationProfiles.map(
          (profile) =>
            profile.organizationId === selected.organizationId
              ? { ...profile, name: "Unregistered college fixture" }
              : profile,
        ),
      },
    };
    expect(backdropForLocation(unknown, viewer, key)).toBeNull();
    const wrongState: World = {
      ...fixture,
      history: {
        ...fixture.history,
        organizationProfiles: fixture.history.organizationProfiles.map(
          (profile) =>
            profile.organizationId === selected.organizationId
              ? { ...profile, locationJurisdictionId: null }
              : profile,
        ),
      },
    };
    expect(backdropForLocation(wrongState, viewer, key)).toBeNull();
  });

  it("renders the generated worker's selected party room with its actual empty peer roster", () => {
    const context = resolveOpeningPlaySceneContext(generatedWorld, viewer);
    const backdrop = backdropForLocation(
      generatedWorld,
      viewer,
      context.locationKey,
    )!;
    expect(backdrop.place).toBe("county-party-office");
    const pictured = placeBackdropPeople(
      generatedWorld,
      viewer,
      backdrop.place,
    );
    expect(pictured).toHaveLength(0);
    expect(pictured.overflow).toEqual([]);
    const html = renderToStaticMarkup(
      createElement(SceneBackdrop, {
        sceneId: null,
        placeBackdrop: backdrop,
        placePeople: pictured,
        children: null,
      }),
    );
    expect(html).toContain(backdrop.url);
    expect(html).not.toContain(`scene-person-${outsider}`);
    console.info(
      JSON.stringify({
        seed,
        place: place.key,
        state: drawn.usps,
        viewer,
        selected: context.workplace,
        backdrop,
        generatedPeerIds: [],
      }),
    );
  });

  it("retains the selected job, employer and category through the actual pictured roster", () => {
    const before = serializeWorld(world);
    const context = resolveOpeningPlaySceneContext(world, viewer);
    const selected = selectedWorkplaceForPerson(world, viewer)!;
    expect(
      activeWorkRelationshipsAt(world, viewer).map(
        (job) => job.relationship.id,
      ),
    ).toContain(secondWorkId);
    expect(context.workplace).toEqual(selected);
    expect(context.presentPeople).toEqual([]);
    const backdrop = backdropForLocation(world, viewer, context.locationKey)!;
    expect(backdrop.place).toBe("county-party-office");
    const pictured = placeBackdropPeople(world, viewer, backdrop.place);
    expect(pictured.map((person) => person.personId)).toContain(colleague);
    expect(pictured.map((person) => person.personId)).not.toContain(outsider);
    const html = renderToStaticMarkup(
      createElement(SceneBackdrop, {
        sceneId: null,
        placeBackdrop: backdrop,
        placePeople: pictured,
        children: null,
      }),
    );
    expect(html).toContain(backdrop.url);
    expect(html).not.toContain(`scene-person-${outsider}`);
    console.info(
      `${JSON.stringify({ seed, place: place.key, state: drawn.usps, viewer, selected, colleague, excludedOtherEmployer: outsider, secondWorkId, backdrop, renderedIds: pictured.map((person) => person.personId) })}\n`,
    );
    expect(serializeWorld(world)).toBe(before);
  });

  it("excludes deceased workers without manufacturing attendance", () => {
    const dead = recordPersonDeath(world, {
      stableKey: `${seed}:deceased`,
      personId: colleague,
      diedAt: world.currentDate,
      causeKey: "custom:fixture-death",
      sourceEntityIds: [colleague],
      summary: "Explicit deceased worker negative fixture.",
      provenance: {
        kind: "authored",
        note: "Negative fixture only; no death outcome inferred from work.",
      },
    });
    expect(
      placeBackdropPeople(dead, viewer, "county-party-office").map(
        (person) => person.personId,
      ),
    ).not.toContain(colleague);
    expect(resolveOpeningPlaySceneContext(dead, viewer).presentPeople).toEqual(
      [],
    );
  });

  it("can picture a future shift using vitality recorded through today", () => {
    const date = new Date(`${world.currentDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 7);
    const moment = {
      ...world.currentMoment,
      date: date.toISOString().slice(0, 10) as World["currentDate"],
    };
    expect(() =>
      placeBackdropPeople(world, viewer, "county-party-office", moment),
    ).not.toThrow();
  });

  it("preserves the selected identities and picture after canonical reload", () => {
    const loaded = deserializeWorld(serializeWorld(world));
    expect(selectedWorkplaceForPerson(loaded, viewer)).toEqual(
      selectedWorkplaceForPerson(world, viewer),
    );
    expect(resolveOpeningPlaySceneContext(loaded, viewer)).toEqual(
      resolveOpeningPlaySceneContext(world, viewer),
    );
    expect(placeBackdropPeople(loaded, viewer, "county-party-office")).toEqual(
      placeBackdropPeople(world, viewer, "county-party-office"),
    );
  });
});
