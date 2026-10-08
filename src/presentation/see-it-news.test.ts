import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { PublicNotices, World39News } from "../player/World39News";
import { organizationProfileAt } from "../simulation";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { governmentUnitJurisdictionId } from "../simulation/government-units";
import type { EntityId, World } from "../simulation/types";
import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectWorld39News, projectWorld39Notices } from "./world39-news";

/**
 * SEE-IT, News: what a place has posted as public notices reaches the News
 * page through the English engine's notice bank, and each public event names
 * the organizations and people it involves. The place is drawn from all 56 by
 * the seed, and the test names it.
 */
const SEED = "see-it-news-2";
const place = drawRandomPlace(SEED);

let world: World;
let playerId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  world = game.world;
  playerId = game.playerPersonId;
}, 240_000);

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;");

const render = (target: World) =>
  renderToStaticMarkup(
    createElement(World39News, {
      world: target,
      personId: playerId,
      onOpenPerson: () => undefined,
    }),
  );

describe(`public events name who and what they involve (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("names the organizations a public event involves, by their recorded names", () => {
    const model = projectWorld39News(world, playerId);
    expect(model.publicEvents.length).toBeGreaterThan(0);
    const named = model.publicEvents.filter(
      (event) => event.organizations.length > 0,
    );
    expect(named.length, "an event names an organization").toBeGreaterThan(0);
    for (const event of model.publicEvents) {
      const source = world.history.events.find((row) => row.id === event.id)!;
      for (const name of event.organizations)
        expect(
          source.involvedEntityIds.some(
            (id) => organizationProfileAt(world, id)?.name === name,
          ),
          name,
        ).toBe(true);
      for (const person of event.people)
        expect(
          source.participants.some((row) => row.personId === person.personId) ||
            source.involvedEntityIds.includes(person.personId),
        ).toBe(true);
    }
    const html = render(world);
    expect(html).toContain('data-testid="world39-event-organizations"');
    expect(html).toContain(escapeHtml(named[0]!.organizations[0]!));
    // No record key or id reaches the page.
    expect(html).not.toMatch(/organization_[0-9a-f]{8}|person_[0-9a-f]{8}/);
  });

  it("posts no notice when no hearing, local measure or election is recorded", () => {
    expect(projectWorld39News(world, playerId).notices).toEqual([]);
    expect(render(world)).not.toContain("world39-notices");
  });
});

describe(`a recorded hearing, ordinance and election post notices (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  // The records are written in the shape the legislative and election writers
  // save them. This is edge-case evidence: the opening world records none yet.
  function withNoticeRecords(): World {
    const unit = [
      ...homeLocalGovernmentUnits(world, playerId).municipal,
      ...homeLocalGovernmentUnits(world, playerId).counties,
      ...homeLocalGovernmentUnits(world, playerId).townships,
    ][0];
    expect(unit, "the place has a local government").toBeDefined();
    const jurisdictionId = governmentUnitJurisdictionId(unit!);
    const measureId = "see-it-news:measure" as EntityId;
    return {
      ...world,
      history: {
        ...world.history,
        legislativeMeasures: [
          {
            id: measureId,
            jurisdictionId,
            designation: "ORD 1",
            shortTitle: "Water rates",
            introducedAt: world.currentDate,
          },
        ],
        legislativeActions: [
          {
            id: "see-it-news:hearing" as EntityId,
            measureId,
            kind: "committee-hearing-held",
            occurredAt: world.currentDate,
          },
        ],
        electionContests: [
          {
            id: "see-it-news:election" as EntityId,
            jurisdictionId,
            scheduledAt: world.currentDate,
            electionDate: world.currentDate,
            office: { title: "Council member" },
          },
        ],
      },
    } as unknown as World;
  }

  it("shows each notice as the bank wrote it, with the record's facts in the slots", () => {
    const posted = withNoticeRecords();
    const notices = projectWorld39Notices(posted, playerId);
    expect(notices.map((notice) => notice.key)).toEqual([
      "notice.hearing.public-hearing",
      "notice.ordinance.council-ordinances",
      "notice.election.notice-of-election",
    ]);
    for (const notice of notices) {
      expect(notice.text).not.toContain("{");
    }
    const [hearing, ordinance, election] = notices;
    expect(hearing!.text).toContain("Water rates");
    expect(ordinance!.text).toContain("ORD 1");
    expect(election!.text).toContain("Council member");
    const html = renderToStaticMarkup(
      createElement(PublicNotices, { notices }),
    );
    expect(html).toContain('data-testid="world39-notices"');
    expect(html).toContain("NOTICE OF ELECTION");
    expect(html).toContain("Water rates");
  });

  it("reads without writing anything", () => {
    const posted = withNoticeRecords();
    const before = posted.history.events.length;
    projectWorld39Notices(posted, playerId);
    expect(posted.history.events).toHaveLength(before);
  });
});
