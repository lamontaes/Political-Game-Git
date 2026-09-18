import { describe, expect, it } from "vitest";
import { addDays } from "../simulation/dates";
import type { EntityId, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { projectPeopleDirectory } from "./people-directory";
import { projectPartyChapters } from "./party-chapter-surface";
import { projectToday, projectWorkRole } from "./day-overview";
import { projectPlacesWorkspace } from "./player-places";
import { projectLegislativeOfficeContext } from "./legislative-office-context";
import { projectOfficeOnboarding } from "./office-onboarding";
import { projectWorldOrientation } from "./living-world-orientation";
import { projectCampaignStrategy } from "./campaign-strategy";
import {
  projectPartyInitiatives,
  projectPartyBodyQuestions,
} from "./party-initiatives";
import { projectPersonContact } from "./person-contact";

/**
 * CRUNCH47: nothing offers a dead person as somebody you can deal with now.
 *
 * History may name the dead, and should — a dossier, a life record, an
 * election result, a life story are all correct to do so. What must never
 * happen is a surface presenting a person as available to ACT: a current
 * officeholder, a working reporter, somebody to contact, a question still
 * awaiting their answer.
 *
 * This became reachable when the mortality model started at the opening
 * rather than on the first ordinary-day pass: before that, a fresh world
 * could not produce a death, so these surfaces were wrong only in worlds
 * nobody had played yet. Two real defects were found by hand in the press
 * lane the day the gate moved. This keeps the class closed rather than
 * waiting for the next one to be found by accident.
 */
const LONG = 1_800_000;

/** Surfaces that present people as available to act now. Historical
 *  surfaces belong nowhere near this list. */
const CAN_ACT_NOW: readonly {
  readonly name: string;
  readonly project: (world: World, personId: EntityId) => unknown;
}[] = [
  { name: "people-directory", project: projectPeopleDirectory },
  { name: "party-chapters", project: projectPartyChapters },
  { name: "today", project: projectToday },
  { name: "work-role", project: projectWorkRole },
  { name: "places-workspace", project: projectPlacesWorkspace },
  { name: "world-orientation", project: projectWorldOrientation },
  {
    name: "legislative-office-context",
    project: (world, personId) =>
      projectLegislativeOfficeContext(world, personId),
  },
  {
    name: "office-onboarding",
    project: (world, personId) => projectOfficeOnboarding(world, personId),
  },
  { name: "campaign-strategy", project: projectCampaignStrategy },
  { name: "party-initiatives", project: projectPartyInitiatives },
  { name: "party-body-questions", project: projectPartyBodyQuestions },
];

function playedForward(seed: string, days: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 30,
      depth: "summarize-earlier-life",
    }),
  ).game!;
  // The player's own clock, not advanceWorld: a world advanced by calling the
  // engine is not the object a player reaches (docs/systems/time.md).
  let world = game.world;
  const target = addDays(world.currentDate, days);
  let guard = 0;
  while (world.currentDate < target && guard < 100) {
    world = passOrdinaryDays(world, 30);
    guard += 1;
  }
  return { world, playerPersonId: game.playerPersonId };
}

describe("no surface offers a dead person as an actor", () => {
  it(
    "every can-act-now projection excludes the recently dead",
    () => {
      const { world, playerPersonId } = playedForward("no-dead-actors", 365);
      const dead = new Map(
        world.history.personDeaths
          .filter((death) => death.diedAt <= world.currentDate)
          .map((death) => [death.personId as string, death.diedAt]),
      );
      // Without a death this proves nothing, so say so rather than pass.
      console.info(
        JSON.stringify({
          days: 365,
          people: Object.keys(world.people).length,
          deaths: dead.size,
        }),
      );
      expect(dead.size).toBeGreaterThan(0);

      const hits: Record<string, string[]> = {};
      for (const surface of CAN_ACT_NOW) {
        let rendered: string;
        try {
          rendered = JSON.stringify(surface.project(world, playerPersonId));
        } catch (error) {
          throw new Error(
            `${surface.name} could not be projected: ${(error as Error).message}`,
          );
        }
        if (!rendered) continue;
        const named = new Set(rendered.match(/person_[0-9a-f]+/g) ?? []);
        const offenders = [...named].filter((id) => dead.has(id));
        if (offenders.length > 0) hits[surface.name] = offenders;
      }
      // Report before asserting, so a failure names the surface and person.
      if (Object.keys(hits).length > 0) console.info(JSON.stringify(hits));
      expect(hits).toEqual({});
    },
    LONG,
  );

  it(
    "no action is offered for reaching somebody who has died",
    () => {
      const { world, playerPersonId } = playedForward("no-dead-contacts", 365);
      const dead = world.history.personDeaths
        .filter((death) => death.diedAt <= world.currentDate)
        .map((death) => death.personId);
      expect(dead.length).toBeGreaterThan(0);

      // The sharpest case in the class: a contact card names one person, so
      // an id check cannot judge it — a dead person's own card legitimately
      // carries their id. What must not happen is an OFFER to reach them.
      const offered: Record<string, string[]> = {};
      for (const personId of dead) {
        if (!world.people[personId]) continue;
        const card = projectPersonContact(world, playerPersonId, personId);
        const live = (
          [
            ["talk", card.talk],
            ["contact", card.contact],
            ["meet", card.meet],
            ["travel", card.travel],
          ] as const
        )
          .filter(([, action]) => action.available)
          .map(([name]) => name);
        if (live.length > 0) offered[personId] = live;
      }
      if (Object.keys(offered).length > 0) console.info(JSON.stringify(offered));
      expect(offered).toEqual({});
    },
    LONG,
  );
});
