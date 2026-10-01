import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { World39News } from "../src/player/World39News";
import type { World } from "../src/simulation/types";
import { newsStoryWorld } from "./fixtures/news-story";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import { SeededRng, pickDistinct } from "../src/simulation/rng";
import { projectNewsArticle } from "../src/presentation/news-front-page";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";
import { assertWorldIntegrity, advanceWorld } from "../src/simulation/world";
import {
  createPressTransitionRegistry,
  storyLeads,
} from "../src/simulation/press";
import { officialViewReflectionEventKey } from "../src/simulation/official-view-reads";
import { recordStoryHeardExposure } from "../src/simulation/press/story-exposure";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
} from "../src/simulation/political-belief-formation";
import { officialOpinionSubject } from "../src/simulation/political-opinion-subjects";
import { officialsBehind } from "../src/simulation/living-world/official-views";
import { LAW_EFFECT_MEASURE_TAG } from "../src/simulation/press/law-effect-news";

const SEED = "news-play-20261001";
const places = lifePlaceStateIdentities();
const [place] = pickDistinct(new SeededRng(SEED), places, 1);
const PLACE = place!.jurisdictionKey;

// The legal signature and service occurrence are explicitly authored fixture
// inputs. All reporting, publication, knowledge and exposure writes are real.
describe(`NEWS seven-step play script in ${PLACE} (seed ${SEED})`, () => {
  const { world, own, resident, measureId } = newsStoryWorld(PLACE, SEED);
  const heard = world.history.lawExposures!.find(
    (row) => row.relation === "news" && row.personId === resident.id,
  )!;

  it("step 1: inspect the recorded law consequence and its source", () => {
    expect(places).toHaveLength(56);
    expect(own.measureId).toBe(measureId);
    expect(own.relation).toBe("own");
    expect(
      world.history.events.some((event) => event.id === own.sourceRecordId),
    ).toBe(true);
  });
  it("step 2: advance the desk and find its published story", () => {
    expect(heard).toBeDefined();
    const lead = storyLeads(world).find(
      (row) => row.id === heard.news!.storyLeadId,
    )!;
    expect(lead.basisEventIds).toContain(heard.news!.basisEventId);
    expect(
      world.history.publications!.some(
        (row) => row.id === heard.news!.publicationId,
      ),
    ).toBe(true);
  });
  it("step 3: open the saved publication without changing the world", () => {
    const before = serializeWorld(world);
    const article = projectNewsArticle(world, heard.news!.publicationId);
    expect(article).not.toBeNull();
    expect(serializeWorld(world)).toBe(before);
  });
  it("step 4: prove that the affected resident actually learned the published story", () => {
    const knowledge = world.history.knowledge.find(
      (row) => row.id === heard.news!.knowledgeId,
    )!;
    expect(knowledge.personId).toBe(resident.id);
    expect(knowledge.source).toMatchObject({
      kind: "media",
      reference: heard.news!.publicationId,
    });
  });
  it("step 5: inspect the heard exposure and full supporting provenance", () => {
    expect(heard.sourceRecordId).toBe(heard.news!.knowledgeId);
    const basis = world.history.events.find(
      (row) => row.id === heard.news!.basisEventId,
    )!;
    expect(basis.tags).toContain(`law-effect:source:${own.id}`);
    expect(heard.amount).toBeNull();
    expect(heard.monthlyPay).toBeNull();
    assertWorldIntegrity(world);
  });
  it("news boundary: an NPC with knowledge but no prior official view records no-opinion without a belief", () => {
    const knowledge = world.history.knowledge.find(
      (row) => row.id === heard.news!.knowledgeId,
    )!;
    const publication = world.history.publications!.find(
      (row) => row.id === heard.news!.publicationId,
    )!;
    const lead = storyLeads(world).find(
      (row) => row.id === heard.news!.storyLeadId,
    )!;
    expect(knowledge.personId).toBe(resident.id);
    expect(knowledge.eventId).toBe(publication.sourceEventId);
    expect(knowledge.source).toMatchObject({
      kind: "media",
      reference: publication.id,
    });
    expect(lead.basisEventIds).toContain(heard.news!.basisEventId);
    expect(heard.measureId).toBe(measureId);
    const basis = world.history.events.find(
      (row) => row.id === heard.news!.basisEventId,
    )!;
    expect(basis.tags).toContain(`${LAW_EFFECT_MEASURE_TAG}${heard.measureId}`);
    const official = officialsBehind(world, heard.measureId).find(
      (act) => act.officialId !== knowledge.personId,
    );
    expect(official).toBeDefined();
    const subject = officialOpinionSubject(official!.officialId);
    expect(official!.act).toBe("signed");
    const signature = world.history.executiveDispositions!.find(
      (row) => row.measureId === heard.measureId && row.action === "signed",
    )!;
    expect(
      world.history.events.find((row) =>
        row.involvedEntityIds.includes(signature.id),
      )?.participants,
    ).toContainEqual(
      expect.objectContaining({
        personId: subject.personId,
        role: "focus:subject",
      }),
    );
    expect(
      world.history.privateBeliefs.filter(
        (row) =>
          row.personId === knowledge.personId &&
          row.subject?.kind === "official" &&
          row.subject.personId === subject.personId,
      ),
    ).toEqual([]);
    expect(
      (world.history.officialViews ?? []).filter(
        (row) =>
          row.personId === knowledge.personId &&
          row.officialId === subject.personId,
      ),
    ).toEqual([]);
    expect(world.control).not.toEqual({
      kind: "person",
      personId: knowledge.personId,
    });
    const before = serializeWorld(world);
    // Direct shared-adapter boundary, not an admitted News consumer. Actual
    // knowledge identifies the reader; no opinion factor is inferred from it.
    const proposal = evaluatePoliticalBeliefFormation(world, {
      stableKey: "news-play:npc-no-factor",
      personId: knowledge.personId,
      subject,
      randomness: "none",
    });
    expect(serializeWorld(world)).toBe(before);
    expect(proposal.outcome).toBe("no-opinion");
    expect(proposal.beliefDimensions).toBeNull();
    expect(
      proposal.evaluation.context.considerations.map((row) => row.stableKey),
    ).toEqual(["default:no-opinion"]);
    const applied = applyNpcPoliticalBeliefFormation(world, proposal);
    expect(applied.history.privateBeliefs).toEqual(
      world.history.privateBeliefs,
    );
    expect(applied.history.officialViews).toEqual(world.history.officialViews);
    expect(applied.history.events).toEqual(world.history.events);
    expect(applied.history.decisionTraces).toHaveLength(
      world.history.decisionTraces.length + 1,
    );
    const trace = applied.history.decisionTraces.at(-1)!;
    expect(trace).toMatchObject({
      decisionId: proposal.evaluation.decisionId,
      selectedOptionKey: "no-opinion",
      context: {
        actorPersonId: knowledge.personId,
        decisionType: "political-belief-formation",
        retention: "durable",
        randomness: "none",
      },
    });
    const loaded = deserializeWorld(serializeWorld(applied));
    expect(loaded.history.decisionTraces.at(-1)).toEqual(trace);
    expect(loaded.history.privateBeliefs).toEqual(world.history.privateBeliefs);
    assertWorldIntegrity(loaded);
  });
  it.todo(
    "step 6: inspect a canonical view decision formed from news; Ruling 28 gives heard exposure no opinion weight and no care/view factor is admitted yet",
  );
  it("step 7: save, continue, and repeat the reading without another exposure", () => {
    const loaded = deserializeWorld(serializeWorld(world));
    const next = advanceWorld(loaded, 1, createPressTransitionRegistry());
    const count = next.history.lawExposures!.length;
    const repeated = recordStoryHeardExposure(next, {
      knowledgeId: heard.news!.knowledgeId,
      basisEventId: heard.news!.basisEventId,
    });
    expect(repeated.history.lawExposures).toHaveLength(count);
    expect(
      repeated.history.lawExposures!.filter(
        (row) => row.stableKey === heard.stableKey,
      ),
    ).toEqual([heard]);
    expect(
      repeated.history.events.some(
        (event) => event.stableKey === officialViewReflectionEventKey(heard),
      ),
    ).toBe(false);
    assertWorldIntegrity(repeated);
  });
  it("player-read extension: click a desk-produced story, save, continue and read again", () => {
    const publication = world.history.publications!.find(
      (row) => row.id === heard.news!.publicationId,
    )!;
    const readerId = world.personOrder.find(
      (id) =>
        !world.history.knowledge.some(
          (row) =>
            row.personId === id && row.eventId === publication.sourceEventId,
        ),
    );
    expect(readerId).toBeDefined();
    // Select an existing nonprofessional reader as the controlled fixture
    // person. No knowledge, publication, or exposure record is injected.
    let session: World = {
      ...world,
      control: { kind: "person", personId: readerId! },
    };
    assertWorldIntegrity(session);
    const before = serializeWorld(session);
    const priorBeliefs = session.history.privateBeliefs;
    const priorViews = session.history.officialViews;
    const priorTraces = session.history.decisionTraces;
    let callbackCount = 0;
    const screen = () =>
      World39News({
        world: session,
        personId: readerId!,
        onOpenPerson: () => {},
        onWorldChange: (next) => {
          callbackCount += 1;
          session = next;
        },
      });
    const rendered = screen();
    expect(renderToStaticMarkup(rendered)).toContain("Read this story");
    expect(callbackCount).toBe(0);
    expect(serializeWorld(session)).toBe(before);
    const click = publicationButton(rendered, publication.id);
    expect(click).not.toBeNull();
    click!();
    expect(callbackCount).toBe(1);
    const knowledge = session.history.knowledge.find(
      (row) =>
        row.personId === readerId && row.eventId === publication.sourceEventId,
    )!;
    expect(knowledge.source).toMatchObject({
      kind: "media",
      reference: publication.id,
    });
    const exposure = session.history.lawExposures!.find(
      (row) => row.relation === "news" && row.sourceRecordId === knowledge.id,
    )!;
    expect(exposure.news).toEqual({
      knowledgeId: knowledge.id,
      publicationId: publication.id,
      storyLeadId: heard.news!.storyLeadId,
      basisEventId: heard.news!.basisEventId,
    });
    expect(exposure.measureId).toBe(measureId);
    expect(session.history.privateBeliefs).toEqual(priorBeliefs);
    expect(session.history.officialViews).toEqual(priorViews);
    expect(session.history.decisionTraces).toEqual(priorTraces);
    const official = officialsBehind(session, exposure.measureId).find(
      (act) => act.officialId !== knowledge.personId,
    );
    expect(official).toBeDefined();
    const afterRead = serializeWorld(session);
    // Evaluating the played reader is read-only. Only the player can choose;
    // the existing NPC writer must reject autonomous application atomically.
    const playerProposal = evaluatePoliticalBeliefFormation(session, {
      stableKey: "news-play:controlled-no-factor",
      personId: knowledge.personId,
      subject: officialOpinionSubject(official!.officialId),
      randomness: "none",
    });
    expect(playerProposal.outcome).toBe("no-opinion");
    expect(serializeWorld(session)).toBe(afterRead);
    expect(() =>
      applyNpcPoliticalBeliefFormation(session, playerProposal),
    ).toThrow(/controlled person/i);
    expect(serializeWorld(session)).toBe(afterRead);
    expect(exposure.amount).toBeNull();
    expect(exposure.monthlyPay).toBeNull();
    expect(session.history.resourceFlows).toEqual(world.history.resourceFlows);
    expect(
      session.history.events.some(
        (event) => event.stableKey === officialViewReflectionEventKey(exposure),
      ),
    ).toBe(false);
    session = advanceWorld(
      deserializeWorld(serializeWorld(session)),
      1,
      createPressTransitionRegistry(),
    );
    const continued = serializeWorld(session);
    const repeat = publicationButton(screen(), publication.id);
    expect(repeat).not.toBeNull();
    repeat!();
    expect(callbackCount).toBe(1);
    expect(serializeWorld(session)).toBe(continued);
    expect(
      session.history.lawExposures!.filter(
        (row) => row.stableKey === exposure.stableKey,
      ),
    ).toEqual([exposure]);
    assertWorldIntegrity(session);
  });
});

/** Finds the actual saved-publication button and invokes its production handler. */
function publicationButton(
  node: ReactNode,
  publicationId: string,
  inPublication = false,
): (() => void) | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = publicationButton(child, publicationId, inPublication);
      if (found) return found;
    }
    return null;
  }
  if (
    !isValidElement<{
      children?: ReactNode;
      "data-publication-id"?: string;
      "data-testid"?: string;
      onClick?: () => void;
    }>(node)
  )
    return null;
  const selected =
    inPublication || node.props["data-publication-id"] === publicationId;
  if (selected && node.props["data-testid"] === "world39-read-publication")
    return node.props.onClick ?? null;
  return publicationButton(node.props.children, publicationId, selected);
}
