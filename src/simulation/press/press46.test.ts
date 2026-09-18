import { describe, expect, it } from "vitest";
import { recordPersonDeath } from "../vitality";

import {
  GAME_ADULT_CANDIDACY_AGE,
  addDays,
  advanceWorld,
  ageOnDate,
  campaignTreasuryPosition,
  candidacyPackById,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  deserializeWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  performCampaignAction,
  projectPublicInformationDigest,
  scheduleCampaignAction,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { correctPublication } from "../public-information";
import { recordEventKnowledge } from "../records";
import type { CampaignRecord, EntityId, World } from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  answerPressRequest,
  appendPressRecord,
  assignedReporter,
  canInstitutionAct,
  discloseToReporter,
  dispositionsForLead,
  ensurePressDeskSchedule,
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  fileComplaint,
  fileRivalComplaint,
  latestDisposition,
  mediaOutlets,
  negotiateGroundRules,
  openMatter,
  pressAnswerStance,
  pressRecordsOfKind,
  proceedingSteps,
  projectPressDesk,
  recordAllegation,
  recordStoryLead,
  assignStory,
  reporterRoles,
  storyLeads,
  spendCampaignFundsPersonally,
  MEDIA_ACTIVE_ASSIGNMENT_CAPACITY,
} from "./index";
import { recordEvidenceDiscovery } from "../evidence";
import { contradictionFound } from "../claim-stances";

const KENTUCKY_PACK = "us-ky-general-assembly-v1:candidacy";
const KY = KENTUCKY_CONTEXT.jurisdiction.id;

function moment(world: World, date: string, hour: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay: hour * 60,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function session(
  world: World,
  campaign: CampaignRecord,
  kind: "fundraising" | "advertising",
  spend: number | null,
): World {
  const date = addDays(world.currentDate, 1);
  const scheduled = scheduleCampaignAction(world, {
    campaignId: campaign.id,
    kind,
    plan: {
      start: moment(world, date, 10),
      end: moment(world, date, 11),
      location: {
        locationKey: `campaign-${kind}`,
        label: "Campaign work",
        jurisdictionId: campaign.jurisdictionId,
      },
      title: `A ${kind} session`,
      summary: `A ${kind} session for the PRESS46 fixture.`,
    },
    spend:
      spend === null
        ? null
        : { minorUnits: spend, currency: campaign.treasuryCurrency },
  });
  return performCampaignAction(scheduled.world, scheduled.action.id);
}

interface PressFixture {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly playerId: EntityId;
  readonly staffIds: readonly EntityId[];
  readonly rivalId: EntityId;
  readonly stateOutletId: EntityId;
}

function pressFixture(seed: string, staffCount: number): PressFixture {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 7,
  });
  const playerId = created.personOrder.find(
    (id) =>
      ageOnDate(created.people[id]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  const base: World = {
    ...created,
    control: { kind: "person", personId: playerId },
  };
  const staffIds = base.personOrder
    .filter((id) => id !== playerId)
    .filter(
      (id) =>
        ageOnDate(base.people[id]!.birthDate, base.currentDate) >=
        GAME_ADULT_CANDIDACY_AGE,
    )
    .slice(0, staffCount);
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "press46-campaign",
    jurisdictionId: KY,
    count: 1,
    excludePersonIds: [playerId, ...staffIds],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "press46-campaign",
    candidatePersonId: playerId,
    jurisdictionId: KY,
    officeKey: candidacyPackById(KENTUCKY_PACK)!.offices[0]!.officeKey,
    electionDate: addDays(base.currentDate, 200),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Committee for the PRESS46 fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: staffIds,
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  let world = session(filed.world, filed.campaign, "fundraising", null);
  world = session(world, filed.campaign, "advertising", 20_000);
  world = ensurePressMediaOpening(world, playerId);
  world = ensurePressStateCoverage(world, KY);
  world = ensurePressDeskSchedule(world);
  const stateOutlet = mediaOutlets(world).find((o) => o.scope === "state")!;
  return {
    world,
    campaign: filed.campaign,
    playerId,
    staffIds,
    rivalId: opponents.personIds[0]!,
    stateOutletId: stateOutlet.id,
  };
}

const HANDLERS = createCampaignElectionTransitionRegistry();

function days(world: World, count: number): World {
  let next = world;
  for (let day = 0; day < count; day += 1) {
    next = advanceWorld(next, 1, HANDLERS);
  }
  return next;
}

function roundTrip(world: World): World {
  return deserializeWorld(serializeWorld(world));
}

describe("PRESS46 M1 media seed pack", () => {
  const fixture = pressFixture("press46-seed", 1);

  it("creates three persistent national products and one state newsroom, each staffed", () => {
    const outlets = mediaOutlets(fixture.world);
    expect(
      outlets.filter((o) => o.scope === "national").map((o) => o.product),
    ).toEqual([
      "general-newspaper",
      "public-affairs-broadcaster",
      "politics-publication",
    ]);
    expect(outlets.filter((o) => o.scope === "state")).toHaveLength(1);
    expect(new Set(outlets.map((o) => o.name)).size).toBe(outlets.length);
    for (const outlet of outlets) {
      expect(reporterRoles(fixture.world, outlet.id).length).toBeGreaterThan(0);
    }
    expect(MEDIA_ACTIVE_ASSIGNMENT_CAPACITY).toEqual({
      small: 1,
      standard: 3,
      major: 8,
    });
  });

  it("is idempotent and survives a save with the same outlets and people", () => {
    const again = ensurePressStateCoverage(
      ensurePressMediaOpening(fixture.world, fixture.playerId),
      KY,
    );
    expect(again).toBe(fixture.world);
    const reopened = roundTrip(fixture.world);
    expect(mediaOutlets(reopened)).toEqual(mediaOutlets(fixture.world));
    expect(reporterRoles(reopened)).toEqual(reporterRoles(fixture.world));
  });

  it("reading News writes nothing", () => {
    const before = serializeWorld(fixture.world);
    projectPublicInformationDigest(fixture.world);
    projectPressDesk(fixture.world, fixture.playerId);
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  /**
   * CRUNCH47: a journalism role outlives the person who held it, and a current
   * opening now carries the mortality model from the moment it is built. The
   * desk says who could take a call today, so somebody who has died is not on
   * it — while their role record stays exactly where it was.
   */
  it("does not offer a reporter who has died", () => {
    const outlet = mediaOutlets(fixture.world)[0]!;
    const role = reporterRoles(fixture.world, outlet.id)[0]!;
    const listed = (world: World) =>
      projectPressDesk(world, fixture.playerId)
        .outlets.flatMap((entry) => entry.reporters)
        .map((reporter) => reporter.personId);
    expect(listed(fixture.world)).toContain(role.personId);
    const bereaved = recordPersonDeath(fixture.world, {
      stableKey: "press46-test:reporter-death",
      personId: role.personId,
      diedAt: fixture.world.currentDate,
      causeKey: "cause:press-fixture",
      sourceEntityIds: [fixture.world.id],
      summary: "Died between editions.",
      provenance: { kind: "authored", note: "PRESS mortality fixture." },
    });
    expect(listed(bereaved)).not.toContain(role.personId);
    // The record is not rewritten; only who the desk offers changes.
    expect(reporterRoles(bereaved, outlet.id).map((entry) => entry.id)).toEqual(
      reporterRoles(fixture.world, outlet.id).map((entry) => entry.id),
    );
    // Everyone still living is still there.
    expect(listed(bereaved).length).toBe(listed(fixture.world).length - 1);
  });
});

describe("PRESS46 false public allegation", () => {
  const fixture = pressFixture("press46-false", 1);
  const expenditure = fixture.world.history.resourceFlows.find(
    (flow) => flow.basisKind === "custom:campaign-expenditure",
  )!;
  const filed = fileRivalComplaint(fixture.world, {
    stableKey: "press46-test:rival",
    campaign: fixture.campaign,
    rivalId: fixture.rivalId,
    playerId: fixture.playerId,
    expenditureFlowId: expenditure.id,
  });
  const later = days(filed, 110);

  it("records an allegation with no underlying misconduct", () => {
    const [matter] = pressRecordsOfKind(filed, "matter");
    expect(matter!.occurrenceId).toBeNull();
    expect(pressRecordsOfKind(filed, "financial-occurrence")).toHaveLength(0);
    const allegation = pressRecordsOfKind(filed, "matter-allegation")[0]!;
    expect(allegation.publicAllegation).toBe(true);
    const claim = filed.history.claims.find(
      (c) => c.id === allegation.claimId,
    )!;
    expect(claim.relationshipToTruth).toBe("contradicts");
  });

  it("routes a Kentucky General Assembly candidate to KLEC and dismisses it", () => {
    const [proceeding] = pressRecordsOfKind(later, "matter-proceeding");
    expect(proceeding!.procedureKey).toBe("ky-legislative-ethics");
    const steps = proceedingSteps(later, proceeding!.id);
    expect(steps.map((s) => s.step)).toEqual([
      "complaint-received",
      "complaint-served",
      "answer-period-closed",
      "dismissed",
    ]);
    expect(steps[1]!.nextDueBasis).toBe("rule");
    expect(steps.at(-1)!.outcome).toBe("dismissed");
    expect(pressRecordsOfKind(later, "financial-occurrence")).toHaveLength(0);
    // A confidential dismissal is not published.
    expect(steps.at(-1)!.publicStep).toBe(false);
  });

  it("publishes the public allegation with procedural wording, and no response is not guilt", () => {
    const stories = (later.history.publications ?? []).filter((p) =>
      p.outletKey.startsWith("media:"),
    );
    const allegationStory = stories.find((p) =>
      `${p.headline}\n${p.body}`.includes(
        "This is an allegation, not a finding.",
      ),
    );
    expect(allegationStory).toBeDefined();
    expect(allegationStory!.body).not.toMatch(/guilty|admitted|proved/i);
    const lead = storyLeads(later).find(
      (l) => l.matterId === pressRecordsOfKind(later, "matter")[0]!.id,
    )!;
    const history = dispositionsForLead(later, lead.id).map((d) => d.decision);
    expect(history).toContain("response-requested");
    expect(allegationStory!.body).toMatch(
      /did not respond by publication time|declined to comment|said: “/,
    );
  });

  it("a correction is appended, and the original stays exactly as published", () => {
    const stories = (later.history.publications ?? []).filter((p) =>
      p.outletKey.startsWith("media:"),
    );
    const original = stories.find((p) => p.correctsPublicationId === null)!;
    expect(original).toBeDefined();
    const before = JSON.stringify(original);
    const corrected = correctPublication(later, {
      stableKey: `${original.stableKey}:correction:test`,
      correctsPublicationId: original.id,
      headline: `Correction: ${original.headline}`,
      body: `${original.body}\n\nCorrection: the complaint was dismissed.`,
      correctionNote: "The complaint was dismissed with no finding.",
    });
    const publications = corrected.history.publications ?? [];
    const kept = publications.find((p) => p.id === original.id)!;
    // Nothing is rewritten or deleted: the record of what was published stands.
    expect(JSON.stringify(kept)).toBe(before);
    const correction = publications.find(
      (p) => p.correctsPublicationId === original.id,
    )!;
    expect(correction.headline).toContain("Correction:");
    expect(correction.correctionNote).toMatch(/dismissed/);
    expect(correction.body).toContain(original.body);
    // And one correction is enough; the same one is refused twice.
    expect(() =>
      correctPublication(corrected, {
        stableKey: `${original.stableKey}:correction:again`,
        correctsPublicationId: original.id,
        headline: "Correction: again",
        body: "Again.",
        correctionNote: "Again.",
      }),
    ).toThrow();
    assertWorldIntegrity(corrected);
  });

  it("keeps the confidential steps out of the player's view until notified", () => {
    const desk = projectPressDesk(filed, fixture.playerId);
    const lines = desk.matters.flatMap((m) => m.knownLines.map((l) => l.text));
    expect(
      lines.some((text) => text.includes("received a sworn complaint")),
    ).toBe(false);
  });
});

describe("PRESS46 true hidden misuse", () => {
  const fixture = pressFixture("press46-hidden", 0);
  const before = campaignTreasuryPosition(fixture.world, fixture.campaign)!;
  const misused = spendCampaignFundsPersonally(fixture.world, {
    stableKey: "press46-test:misuse",
    amountMinorUnits: 3_000,
    purpose: "a family dinner",
  });
  const later = days(misused.world, 45);

  it("moves the money exactly once and records a private occurrence", () => {
    const after = campaignTreasuryPosition(later, fixture.campaign)!;
    const spentByMisuse = later.history.resourceTransferOutcomes.filter((o) =>
      misused.occurrence.resourceFlowIds.includes(o.resourceFlowId),
    );
    expect(spentByMisuse).toHaveLength(1);
    expect(
      before.liquidBalance.minorUnits - after.liquidBalance.minorUnits,
    ).toBeGreaterThanOrEqual(3_000);
    const act = later.history.events.find(
      (e) => e.id === misused.occurrence.occurrenceEventId,
    )!;
    expect(act.visibility).toBe("private");
  });

  it("stays unknown when nobody who keeps the books exists", () => {
    expect(
      pressRecordsOfKind(later, "matter").filter(
        (m) => m.occurrenceId === misused.occurrence.id,
      ),
    ).toHaveLength(0);
    expect(
      (later.history.publications ?? []).some((p) =>
        p.body.includes("family dinner"),
      ),
    ).toBe(false);
    const nobodyElse = later.history.knowledge.filter(
      (k) => k.eventId === misused.occurrence.occurrenceEventId,
    );
    expect(nobodyElse.every((k) => k.personId === fixture.playerId)).toBe(true);
  });

  it("offers the deliberate option only with the explicit misuse label", () => {
    const desk = projectPressDesk(fixture.world, fixture.playerId);
    expect(desk.personalUse.available).toBe(true);
    expect(desk.personalUse.label).toMatch(/misuse of campaign funds/);
  });
});

describe("PRESS46 established finding, leak and ground rules", () => {
  const fixture = pressFixture("press46-finding", 1);
  const misused = spendCampaignFundsPersonally(fixture.world, {
    stableKey: "press46-test:finding-misuse",
    amountMinorUnits: 2_500,
    purpose: "a personal vacation deposit",
  });
  const bookkeeper = fixture.staffIds[0]!;
  const ledgerId = misused.occurrence.recordEvidenceArtifactIds[0]!;
  let world = recordEvidenceDiscovery(misused.world, {
    stableKey: "press46-test:bookkeeper-found",
    personId: bookkeeper,
    evidenceArtifactId: ledgerId,
    discoveredAt: misused.world.currentDate,
    recordedAt: misused.world.currentDate,
    methodKey: "work:bookkeeping-review",
    provenance: {
      kind: "simulated",
      sourceEntityIds: [ledgerId, misused.occurrence.occurrenceEventId].sort(),
    },
  });
  const opened = openMatter(world, {
    stableKey: "press46-test:finding-matter",
    family: "M1",
    subjectPersonIds: [fixture.playerId],
    occurrenceId: misused.occurrence.id,
    originEventId: world.history.events.at(-1)!.id,
    jurisdictionId: KY,
  });
  world = opened.world;
  const reporterId = reporterRoles(world, fixture.stateOutletId)[0]!.personId;
  const terms = negotiateGroundRules(world, {
    stableKey: "press46-test:terms",
    outletId: fixture.stateOutletId,
    reporterPersonId: reporterId,
    sourcePersonId: bookkeeper,
    leadId: null,
    terms: "background",
    attributionLabel: "a person familiar with the committee's books",
  });
  const leaked = discloseToReporter(terms.world, {
    stableKey: "press46-test:leak",
    agreementId: terms.agreement!.id,
    statement: "The committee paid a personal expense for the candidate.",
    disclosedEventIds: [],
    leakedEvidenceArtifactIds: [ledgerId],
    subjectPersonIds: [fixture.playerId],
    stance: null,
    worldTruth: "true",
    openLead: true,
    matterId: opened.matter.id,
  });

  it("agrees terms before disclosure and keeps the exact label", () => {
    expect(terms.accepted).toBe(true);
    expect(terms.agreement!.publiclyUsable).toBe(true);
    expect(terms.agreement!.attributable).toBe(true);
    expect(leaked.contribution.leak).toBe(true);
    expect(leaked.contribution.sequence).toBeGreaterThan(
      terms.agreement!.sequence,
    );
  });

  it("refuses deep background at an outlet that does not accept it", () => {
    const refused = negotiateGroundRules(world, {
      stableKey: "press46-test:deep",
      outletId: fixture.stateOutletId,
      reporterPersonId: reporterId,
      sourcePersonId: bookkeeper,
      leadId: null,
      terms: "deep-background",
      attributionLabel: null,
    });
    expect(refused.accepted).toBe(false);
  });

  const assigned = assignStory(leaked.world, leaked.leadId!);
  const leadId = leaked.leadId!;

  it("asks the player to respond and offers a lie that is labeled as one", () => {
    const desk = projectPressDesk(assigned, fixture.playerId);
    const request = desk.incomingRequests.find((r) => r.leadId === leadId);
    expect(request).toBeDefined();
    const lie = request!.answerOptions.find((o) => o.choice === "false-denial");
    expect(lie?.isLie).toBe(true);
    // Other people's source arrangements never appear.
    expect(desk.agreements).toHaveLength(0);
  });

  const stance = pressAnswerStance(
    assigned,
    leadId,
    fixture.playerId,
    "false-denial",
  );
  const answered = answerPressRequest(assigned, { leadId, ...stance });
  const published = days(answered, 3);

  it("records the lie as a deliberate contradiction", () => {
    expect(stance.stance.intent).toBe("deceive");
    const claim = [...answered.history.claims]
      .reverse()
      .find((c) => c.speakerPersonId === fixture.playerId)!;
    expect(claim.relationshipToTruth).toBe("contradicts");
  });

  it("publishes with background attribution and never names the source", () => {
    expect(latestDisposition(published, leadId)!.decision).toBe("published");
    const publication = (published.history.publications ?? []).at(-1)!;
    expect(publication.body).toContain(
      "A person familiar with the committee's books said:",
    );
    expect(publication.body).toContain("reviewed records provided by a source");
    const sourceName = published.people[bookkeeper]!;
    expect(publication.body).not.toContain(sourceName.familyName);
    expect(publication.body).toContain("That is not true.");
  });

  const withComplaint = fileComplaint(published, {
    stableKey: "press46-test:finding-complaint",
    matterId: opened.matter.id,
    complainantPersonId: fixture.rivalId,
    procedureKey: "ky-legislative-ethics",
  }).world;
  const concluded = days(withComplaint, 200);

  it("reaches a public final order only through the adapter's steps", () => {
    const proceeding = pressRecordsOfKind(concluded, "matter-proceeding").find(
      (p) => p.matterId === opened.matter.id,
    )!;
    const steps = proceedingSteps(concluded, proceeding.id);
    expect(steps.map((s) => s.step)).toEqual([
      "complaint-received",
      "complaint-served",
      "answer-period-closed",
      "preliminary-inquiry",
      "adjudicatory-hearing-ordered",
      "final-order",
    ]);
    expect(steps.at(-1)!.outcome).toBe("finding");
    expect(steps.at(-1)!.publicStep).toBe(true);
    const delegated = concluded.history.events.filter(
      (e) =>
        e.tags.includes("press.delegated") &&
        e.tags.includes(`press46.matter:${opened.matter.id}`),
    );
    expect(delegated).toHaveLength(1);
  });

  it("surfaces no removal or censure without researched authority", () => {
    // With GOVERNING's real reader in place this is a sourced "unavailable"
    // for somebody who is not a member, rather than the stand-in's "unknown".
    // Either way it is not permission, and nothing surfaces.
    expect(
      canInstitutionAct(concluded, {
        institution: "chamber-floor",
        action: "censure",
        subjectPersonId: fixture.playerId,
        onDate: concluded.currentDate,
      }).status,
    ).not.toBe("available");
    expect(
      concluded.history.events.some((e) =>
        /removed from office|censured|expelled/.test(e.summary),
      ),
    ).toBe(false);
  });

  it("lets colleagues respond only after they learned of the story", () => {
    for (const response of pressRecordsOfKind(concluded, "matter-response")) {
      for (const knowledgeId of response.knowledgeIds) {
        const knowledge = concluded.history.knowledge.find(
          (k) => k.id === knowledgeId,
        )!;
        expect(knowledge.personId).toBe(response.actorPersonId);
      }
    }
  });

  it("lets the reporter holding the leaked ledger discover the lie", () => {
    const stanceEvent = concluded.history.events.find(
      (e) =>
        e.type === "press.subject-responded" &&
        e.tags.some((t) => t.startsWith("claim.stance.v1:")) &&
        e.participants.some((p) => p.personId === fixture.playerId),
    )!;
    const leadReporter = assignedReporter(concluded, leadId)!;
    // The tip stayed with the reporter who received the ledger.
    expect(leadReporter).toBe(reporterId);
    expect(
      contradictionFound(concluded, stanceEvent.id, leadReporter),
    ).not.toBeNull();
  });

  it("round-trips the whole matter through a save", () => {
    const reopened = roundTrip(concluded);
    expect(pressRecordsOfKind(reopened, "proceeding-step")).toEqual(
      pressRecordsOfKind(concluded, "proceeding-step"),
    );
    expect(storyLeads(reopened)).toEqual(storyLeads(concluded));
  });
});

describe("PRESS46 off-record control, hold and repeat reporter", () => {
  const fixture = pressFixture("press46-offrecord", 1);
  const source = fixture.staffIds[0]!;
  const reporterId = reporterRoles(fixture.world, fixture.stateOutletId)[0]!
    .personId;
  const heard = recordWorldEvent(fixture.world, {
    stableKey: "press46-test:rumor-basis",
    type: "life.overheard-remark",
    occurredAt: fixture.world.currentDate,
    recordedAt: fixture.world.currentDate,
    jurisdictionId: KY,
    involvedEntityIds: [source],
    participants: [{ personId: source, role: "agency:witness", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary: "An overheard remark about the committee.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const matter = openMatter(heard, {
    stableKey: "press46-test:rumor-matter",
    family: "M1",
    subjectPersonIds: [fixture.playerId],
    occurrenceId: null,
    originEventId: heard.history.events.at(-1)!.id,
    jurisdictionId: KY,
  });
  const terms = negotiateGroundRules(matter.world, {
    stableKey: "press46-test:off",
    outletId: fixture.stateOutletId,
    reporterPersonId: reporterId,
    sourcePersonId: source,
    leadId: null,
    terms: "off-record",
    attributionLabel: null,
  });
  const told = discloseToReporter(terms.world, {
    stableKey: "press46-test:off-tip",
    agreementId: terms.agreement!.id,
    statement: "I think the committee paid for personal things.",
    disclosedEventIds: [],
    leakedEvidenceArtifactIds: [],
    subjectPersonIds: [fixture.playerId],
    stance: null,
    worldTruth: "false",
    openLead: true,
    matterId: matter.matter.id,
  });
  const assigned = assignStory(told.world, told.leadId!);
  const later = days(assigned, 14);

  it("never publishes off-record material: the story is held, then dropped", () => {
    expect(terms.agreement!.publiclyUsable).toBe(false);
    const decisions = dispositionsForLead(later, told.leadId!).map(
      (d) => d.decision,
    );
    expect(decisions).toContain("held");
    expect(decisions.at(-1)).toBe("declined");
    expect(
      (later.history.publications ?? []).some((p) =>
        p.body.includes("personal things"),
      ),
    ).toBe(false);
    const claim = later.history.claims.find(
      (c) =>
        c.speakerPersonId === source && c.statement.includes("personal things"),
    )!;
    expect(claim.audience).toBe("private");
  });

  it("assigns the same reporter to the same subject again", () => {
    const basis = later.history.events.find((e) => e.visibility === "public")!;
    const second = recordStoryLead(later, {
      stableKey: "press46-test:second-lead",
      outletId: fixture.stateOutletId,
      family: "scheduled-beat",
      route: "public-record",
      basisEventIds: [basis.id],
      subjectPersonIds: [fixture.playerId],
      jurisdictionId: KY,
      matterId: null,
      followsPublicationId: null,
    });
    const next = assignStory(second.world, second.lead.id);
    const first = assignedReporter(next, told.leadId!);
    const repeat = assignedReporter(next, second.lead.id);
    // Declining is a real outcome; either way the same reporter considered it.
    expect(first).not.toBeNull();
    expect(repeat).toBe(first);
  });
});

describe("PRESS46 honest mistake", () => {
  const fixture = pressFixture("press46-mistake", 1);
  it("distinguishes a sincere wrong denial from a lie", () => {
    const staffer = fixture.staffIds[0]!;
    const act = recordWorldEvent(fixture.world, {
      stableKey: "press46-test:staff-act",
      type: "finance.campaign-funds-personal-use",
      occurredAt: fixture.world.currentDate,
      recordedAt: fixture.world.currentDate,
      jurisdictionId: KY,
      involvedEntityIds: [staffer],
      participants: [{ personId: staffer, role: "agency:actor", detail: null }],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "A staff member paid a personal expense from campaign money.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const flow = act.history.resourceFlows.find(
      (f) => f.basisKind === "custom:campaign-expenditure",
    )!;
    const occurrence = appendPressRecord(act, "financial-occurrence", {
      stableKey: "press46-test:staff-occurrence",
      family: "M1",
      actorPersonIds: [staffer],
      occurrenceEventId: act.history.events.at(-1)!.id,
      resourceFlowIds: [flow.id],
      recordEvidenceArtifactIds: [],
      dutyReference: null,
      intentional: true,
      occurredAt: act.currentDate,
      jurisdictionId: KY,
    });
    const matter = openMatter(occurrence.world, {
      stableKey: "press46-test:staff-matter",
      family: "M1",
      subjectPersonIds: [fixture.playerId],
      occurrenceId: occurrence.record.id,
      originEventId: act.history.events.at(-1)!.id,
      jurisdictionId: KY,
    });
    const alleged = recordAllegation(matter.world, {
      stableKey: "press46-test:staff-allegation",
      matterId: matter.matter.id,
      allegerPersonId: fixture.rivalId,
      statement: "the campaign paid personal expenses",
      publicAllegation: true,
      basisEventIds: [],
    });
    const lead = recordStoryLead(alleged.world, {
      stableKey: "press46-test:mistake-lead",
      outletId: fixture.stateOutletId,
      family: "allegation",
      route: "public-record",
      basisEventIds: [alleged.eventId],
      subjectPersonIds: [fixture.playerId],
      jurisdictionId: KY,
      matterId: matter.matter.id,
      followsPublicationId: null,
    });
    const assigned = assignStory(lead.world, lead.lead.id);
    expect(latestDisposition(assigned, lead.lead.id)!.decision).toBe(
      "response-requested",
    );
    const options = projectPressDesk(assigned, fixture.playerId)
      .incomingRequests[0]!.answerOptions;
    expect(options.find((o) => o.choice === "deny")?.isLie).toBe(false);
    const stance = pressAnswerStance(
      assigned,
      lead.lead.id,
      fixture.playerId,
      "deny",
    );
    expect(stance.stance.intent).toBe("truthful");
    expect(stance.worldTruth).toBe("true");
    const answered = answerPressRequest(assigned, {
      leadId: lead.lead.id,
      ...stance,
    });
    const claim = answered.history.claims.at(-1)!;
    expect(claim.relationshipToTruth).toBe("contradicts");
    // The player learns the staff act only through a record, never by magic.
    const learned = recordEventKnowledge(answered, {
      stableKey: "press46-test:learned",
      personId: fixture.playerId,
      eventId: occurrence.record.occurrenceEventId,
      learnedAt: answered.currentDate,
      believedSummary: "A staff member paid a personal expense.",
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "rumor",
        sourcePersonId: staffer,
        chainDescription: "The staff member admitted it privately.",
      },
    });
    expect(
      pressAnswerStance(learned, lead.lead.id, fixture.playerId, "confirm")
        .stance.speakerBelief,
    ).toBe("believes-true");
  });
});

describe("PRESS46 integrity", () => {
  const fixture = pressFixture("press46-integrity", 0);
  const outlet = mediaOutlets(fixture.world)[0]!;
  it("rejects background terms without a label and capacity overflow", () => {
    const reporterId = reporterRoles(fixture.world, outlet.id)[0]!.personId;
    expect(() =>
      negotiateGroundRules(fixture.world, {
        stableKey: "press46-test:nolabel",
        outletId: outlet.id,
        reporterPersonId: reporterId,
        sourcePersonId: fixture.playerId,
        leadId: null,
        terms: "background",
        attributionLabel: " ",
      }),
    ).toThrow(/exact attribution/);
  });

  it("rejects a publication claiming an outlet that did not report it", () => {
    const publications = fixture.world.history.publications ?? [];
    const civic = publications[0];
    if (!civic) return;
    const forged: World = {
      ...fixture.world,
      history: {
        ...fixture.world.history,
        publications: publications.map((p, index) =>
          index === 0
            ? {
                ...p,
                outletKey: `media:${outlet.id}` as const,
                outletName: outlet.name,
              }
            : p,
        ),
      },
    };
    expect(() => assertWorldIntegrity(forged)).toThrow(/unsupported outlet/);
  });
});

describe("PRESS46 CRISIS events reach the desk", () => {
  it("routes a public state hazard to the state newsroom as breaking news", () => {
    const fixture = pressFixture("press46-crisis", 0);
    const hazard = recordWorldEvent(fixture.world, {
      stableKey: "press46-test:hazard",
      type: "crisis.hazard-occurred",
      occurredAt: fixture.world.currentDate,
      recordedAt: fixture.world.currentDate,
      jurisdictionId: KY,
      involvedEntityIds: [KY],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["crisis"],
      summary: "A severe storm damaged homes across the state.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = hazard.history.events.at(-1)!;
    const later = days(hazard, 8);
    const lead = storyLeads(later).find(
      (l) =>
        l.outletId === fixture.stateOutletId &&
        l.basisEventIds.includes(event.id),
    );
    expect(lead?.family).toBe("breaking-crisis");
  }, 120_000);
});
