import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { World39News } from "../../src/player/World39News";

import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/index";
import { recordLawExposure } from "../../src/simulation/law-exposure";
import { enactThroughDesk } from "../fixtures/enact-through-desk";
import { smallWorld } from "../fixtures/small-world";
import { introduceMeasure } from "../../src/simulation/legislation";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import {
  KENTUCKY_CONTEXT,
  createLegislativeScenario,
} from "../../src/simulation/legislation-scenarios";
import { ensureStateExecutiveIncumbent } from "../../src/simulation/nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "../../src/simulation/governing/state-governing";
import { officialViewReflectionEventKey } from "../../src/simulation/official-view-reads";
import { publishPublicEvent } from "../../src/simulation/public-information";
import {
  PRESS_STORY_EVENT_TYPE,
  PRESS_STORY_OUTLET_TAG,
  PRESS_STORY_LEAD_TAG,
} from "../../src/simulation/public-information-integrity";
import { readPressPublication } from "../../src/simulation/press/read-publication";
import type { World } from "../../src/simulation/types";
import {
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import {
  ensurePressDeskSchedule,
  ensurePressStateCoverage,
  ensurePressLocalCoverage,
  mediaOutlets,
  recordStoryLead,
} from "../../src/simulation/press/index";
import { reportLawEffects } from "../../src/simulation/press/law-effect-news";

const KY = KENTUCKY_CONTEXT.jurisdiction.id;

/*
 * Controlled publication fixture: canonical saved law, effect, outlet, lead
 * and publication writers. Stops before professional readers. This proves
 * the explicit read adapter, not natural newsroom production or all places.
 */
function heardWorld() {
  const scenario = createLegislativeScenario("kentucky");
  const small = smallWorld({
    place: "KY",
    people: 6,
    seed: "story-heard-small-world",
  });
  const filed = introduceMeasure(small.world, {
    ...scenario.world.history.legislativeMeasures![0]!,
    stableKey: "story-heard:measure",
    sponsorPersonId: small.personId,
  });
  const measureId = filed.history.legislativeMeasures!.at(-1)!.id;
  const context = {
    ...scenario,
    measureId,
    bodies: scenario.bodies.map((body) => ({
      ...body,
      members: body.members.map((member) => ({
        ...member,
        personId: member.personId
          ? (small.world.personOrder[
              scenario.world.personOrder.indexOf(member.personId)
            ] ?? null)
          : null,
      })),
    })),
  };
  const seated = ensureStateExecutiveIncumbent(filed, small.personId, "KY");
  const governor = governorOfficeForJurisdiction(seated, "US-KY")!;
  // Keep control with the actual signer while their desk work is pending.
  let world = enactThroughDesk(
    {
      ...seated,
      control: { kind: "person", personId: governor.holderPersonId },
    },
    measureId,
    { context },
  );
  world = ensurePressStateCoverage(world, KY);
  world = ensurePressDeskSchedule(world);
  const resident =
    world.people[world.personOrder.find((id) => id !== small.personId)!]!;
  const town = resident.homeJurisdictionId;
  world = ensurePressLocalCoverage(world, resident.id);
  const date = world.currentDate;
  world = recordWorldEvent(world, {
    stableKey: "story-heard:service",
    type: "test.recorded-law-effect",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: town,
    involvedEntityIds: [resident.id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "An explicitly authored non-money effect fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordLawExposure(world, {
    stableKey: "story-heard:own",
    personId: resident.id,
    measureId,
    sectionKey: "hours",
    channel: "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId: world.history.events.at(-1)!.id,
    includeFamily: false,
  });
  const own = world.history.lawExposures!.at(-1)!;
  world = recordWorldEvent(world, {
    stableKey: "story-heard:leave-desk",
    type: "test.control-moved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      governor.holderPersonId,
      resident.id,
      ...playerRequiredWorkIds(world, governor.holderPersonId),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "The controlled fixture leaves the governor's desk to watch the newspaper.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = releasePlayerRequiredWork(world, {
    personId: governor.holderPersonId,
    stableKeyPrefix: "story-heard:leave-desk",
    outcomeEventId: world.history.events.at(-1)!.id,
  });
  world = { ...world, control: { kind: "person", personId: small.personId } };
  world = reportLawEffects(world, 0);
  const basis = world.history.events.find((e) =>
    e.tags.includes(`law-effect:source:${own.id}`),
  )!;
  const outlet = mediaOutlets(world).find((o) => o.scope === "local")!;
  world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
  const lead = recordStoryLead(world, {
    stableKey: "story-heard:editorial-fixture",
    outletId: outlet.id,
    family: "scheduled-beat",
    route: "public-record",
    basisEventIds: [basis.id],
    subjectPersonIds: [resident.id],
    jurisdictionId: town,
    matterId: null,
    followsPublicationId: null,
  });
  world = recordWorldEvent(lead.world, {
    stableKey: "explicit-read:controlled-story",
    type: PRESS_STORY_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [lead.lead.id, outlet.organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `${PRESS_STORY_OUTLET_TAG}${outlet.id}`,
      `${PRESS_STORY_LEAD_TAG}${lead.lead.id}`,
    ],
    summary: "A controlled published report of the saved service effect.",
    context: {
      location: null,
      socialContext: "The report cites the saved service effect.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = publishPublicEvent(world, {
    stableKey: "explicit-read:publication",
    sourceEventId: world.history.events.at(-1)!.id,
    outletId: outlet.id,
  });
  return {
    world,
    readerId: small.personId,
    publication: world.history.publications!.at(-1)!,
    basis,
    measureId,
    own,
  };
}

describe("an explicit player read of a saved publication", () => {
  const fixture = heardWorld();
  it("saves actual publication knowledge and exactly one provenance-linked news exposure", () => {
    const { world, readerId, publication, basis, measureId } = fixture;
    expect(
      world.history.knowledge.some(
        (row) =>
          row.personId === readerId &&
          row.eventId === publication.sourceEventId,
      ),
    ).toBe(false);
    const read = readPressPublication(world, readerId, publication.id);
    const knowledge = read.history.knowledge.find(
      (row) =>
        row.personId === readerId && row.eventId === publication.sourceEventId,
    )!;
    expect(knowledge.source).toMatchObject({
      kind: "media",
      reference: publication.id,
    });
    const heard = read.history.lawExposures!.filter(
      (row) => row.relation === "news" && row.personId === readerId,
    );
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({
      measureId,
      amount: null,
      viaPersonId: null,
      direction: "none",
      news: {
        knowledgeId: knowledge.id,
        publicationId: publication.id,
        basisEventId: basis.id,
      },
    });
    expect(
      read.history.events.some(
        (row) => row.stableKey === officialViewReflectionEventKey(heard[0]!),
      ),
    ).toBe(false);
    assertWorldIntegrity(read);
    const continued = deserializeWorld(serializeWorld(read));
    expect(readPressPublication(continued, readerId, publication.id)).toBe(
      continued,
    );
    expect(serializeWorld(continued)).toBe(serializeWorld(read));
  });
  it("does not learn through rendering, an absent publication, or another person's click", () => {
    const { world, readerId, publication } = fixture;
    expect(readPressPublication(world, readerId, readerId)).toBe(world);
    const other = world.personOrder.find((id) => id !== readerId)!;
    expect(readPressPublication(world, other, publication.id)).toBe(world);
    expect(
      world.history.lawExposures!.filter((row) => row.relation === "news"),
    ).toHaveLength(0);
  });
});

function readButton(node: ReactNode): (() => void) | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = readButton(child);
      if (found) return found;
    }
    return null;
  }
  if (
    !isValidElement<{
      children?: ReactNode;
      "data-testid"?: string;
      onClick?: () => void;
    }>(node)
  )
    return null;
  if (node.props["data-testid"] === "world39-read-publication")
    return node.props.onClick ?? null;
  return readButton(node.props.children);
}

it("the News story action saves only on the player's explicit click", () => {
  const { world, readerId, publication } = heardWorld();
  let changed: World | null = null;
  const props = {
    world,
    personId: readerId,
    onOpenPerson: () => {},
    onWorldChange: (next: World) => {
      changed = next;
    },
  };
  const before = serializeWorld(world);
  const markup = renderToStaticMarkup(World39News(props));
  expect(markup).toContain('data-testid="world39-read-publication"');
  expect(changed).toBeNull();
  expect(serializeWorld(world)).toBe(before);
  const click = readButton(World39News(props));
  expect(click).not.toBeNull();
  click!();
  expect(changed).not.toBeNull();
  expect(
    changed!.history.knowledge.some(
      (row) =>
        row.personId === readerId &&
        row.source.kind === "media" &&
        row.source.reference === publication.id,
    ),
  ).toBe(true);
  expect(
    readButton(World39News({ ...props, onWorldChange: undefined })),
  ).toBeNull();
});
