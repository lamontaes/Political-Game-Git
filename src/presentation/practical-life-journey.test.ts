import {
  submitTimeCommand,
  previewTimeCommand,
  describeTimeCommandPreview,
} from "./time-command";
import { openOrdinaryLife } from "./ordinary-life";
import { describe, expect, it } from "vitest";
import {
  serializeWorld,
  deserializeWorld,
  simulationMinutesBetween,
  scheduledActivityState,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectOpeningWorldSnapshot } from "./opening-world-snapshot";
import { projectPersonDossier } from "./person-dossier";
import { projectPracticalActivity } from "./practical-activity";
import { projectPracticalOpportunities } from "./practical-opportunities";
import { projectContacts, askToMeet } from "./people-contacts";
import { projectPersonContact } from "./person-contact";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
} from "./life-scene-flow";

function open(placeKey: string, age: number, alone = false) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `playtest65-journey-${placeKey}-${age}`,
      placeKey,
      startAge: age,
      startKind: "custom",
      household: alone ? "lives-alone" : "shares-a-home",
    }),
  ).game!;
}
describe("PLAYTEST65 real opening and practical-life readers", () => {
  it("keeps an adult living alone oriented, supports real remote contact, and preserves a local return", () => {
    const { world, playerPersonId: player } = open(
      "lexington-fayette",
      34,
      true,
    );
    const saved = serializeWorld(world);
    const opening = projectOpeningWorldSnapshot(world, player);
    expect(opening.life.household.household).toEqual([]);
    expect(currentOpeningLifeScene(world, player)).toBeNull();
    expect(projectPracticalActivity(world, player).current?.setting).toBe(
      "home",
    );
    const contacts = projectContacts(world, player);
    const contact = contacts.contacts.find((item) =>
      item.channels.some((channel) => channel.kind === "call"),
    )!;
    expect(contact).toBeDefined();
    expect(
      projectPersonContact(world, player, contact.personId).contact.available,
    ).toBe(true);
    const dossier = projectPersonDossier(world, player, contact.personId)!;
    expect(dossier.howYouKnowThem || dossier.sharedHistory.length).toBeTruthy();
    projectPracticalOpportunities(world, player);
    expect(serializeWorld(world)).toBe(saved);
    const walkPreview = previewTimeCommand(world, player, {
      kind: "walk",
      destination: "neighborhood",
    })!;
    expect(describeTimeCommandPreview(walkPreview)).toContain("5 minutes");
    const outResult = submitTimeCommand(world, {
      requestId: "journey-walk-out",
      personId: player,
      sourceMoment: world.currentMoment,
      command: { kind: "walk", destination: "neighborhood" },
    });
    expect(outResult.receipt.status).toBe("accepted");
    const out = outResult.world;
    expect(openingLifeLocation(out, player)?.setting).toBe("neighborhood");
    const homeResult = submitTimeCommand(out, {
      requestId: "journey-walk-home",
      personId: player,
      sourceMoment: out.currentMoment,
      command: { kind: "walk", destination: "home" },
    });
    expect(homeResult.receipt.status).toBe("accepted");
    const home = homeResult.world;
    expect(openingLifeLocation(home, player)?.setting).toBe("home");
    expect(
      simulationMinutesBetween(world.currentMoment, home.currentMoment),
    ).toBe(10);
    const restored = deserializeWorld(serializeWorld(home));
    expect(
      projectPersonDossier(restored, player, contact.personId)?.howYouKnowThem,
    ).toBe(dossier.howYouKnowThem);
    const asked = askToMeet(restored, {
      personId: player,
      otherPersonId: contact.personId,
      on: projectContacts(restored, player).earliestMeetingOn,
      purpose: "Talk about our plans",
    });
    expect(asked.currentMoment).toEqual(restored.currentMoment);
    const ordinary = openOrdinaryLife(asked, player);
    const meeting = projectPracticalActivity(ordinary, player).activities.find(
      (entry) => entry.activity.title === "Posted public meeting",
    )!;
    expect(meeting.refusal).toBeNull();
    const attended = submitTimeCommand(ordinary, {
      requestId: "journey-attend",
      personId: player,
      sourceMoment: ordinary.currentMoment,
      command: meeting.command,
    });
    expect(attended.receipt.status).toBe("accepted");
    expect(attended.world.currentMoment).toEqual(meeting.state.end);
    expect(attended.receipt.outcome).toBe(
      `You completed ${meeting.activity.title} at ${meeting.activity.location.label}.`,
    );
    expect(
      scheduledActivityState(attended.world, meeting.activity.id).status,
    ).toBe("completed");
    expect(openingLifeLocation(attended.world, player)?.label).toBe(
      meeting.activity.location.label,
    );
    const continued = deserializeWorld(serializeWorld(attended.world));
    expect(projectPracticalActivity(continued, player).current).toEqual(
      projectPracticalActivity(attended.world, player).current,
    );
  });
  it.each([
    ["1150000", 34],
    ["lexington-fayette", 7],
  ] as const)("keeps %s age %s read-only and age appropriate", (place, age) => {
    const { world, playerPersonId } = open(place, age);
    const before = serializeWorld(world);
    const opening = projectOpeningWorldSnapshot(world, playerPersonId);
    expect(opening.life.age).toBe(age);
    if (place === "1150000") {
      expect(opening.beats.some((item) => item.key === "district")).toBe(true);
      expect(opening.orientation.homeState?.governor).toBeNull();
    }
    const opportunities = projectPracticalOpportunities(world, playerPersonId);
    if (age < 18)
      expect(
        opportunities.careers.every((item) => item.unavailable !== null),
      ).toBe(true);
    expect(serializeWorld(world)).toBe(before);
  });
});
