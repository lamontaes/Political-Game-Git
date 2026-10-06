import { createRoot } from "react-dom/client";
import { useState } from "react";
import "../../../src/player/player.css";
import { CampaignWorkspace } from "../../../src/player/CampaignWorkspace";
import {
  addDays,
  campaignManagerCandidates,
  candidacyPackById,
  createResourcePosition,
  createScenarioWorld,
  createWorkRelationship,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  offerCampaignManager,
  recordRelationshipInteraction,
} from "../../../src/simulation";
import { contributeOwnMoneyToCampaign } from "../../../src/simulation/campaign-money-sources";
import { fixtureMeetsRecordedCandidacyAge } from "../../fixtures/candidacy-age";
import { namedSeatForFixture } from "../../fixtures/campaign-fixture";
import { KENTUCKY_CONTEXT } from "../../../src/simulation/legislation-scenarios";
import { generatePoliticalStartingConditions } from "../../../src/simulation/world-setup/political-start";
import { ensureWorldStartingConditions } from "../../../src/simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../../src/simulation/world-setup/types";

const created = createScenarioWorld(
  "campaign-manager-screen-proof",
  KENTUCKY_CONTEXT,
  { peopleCount: 12 },
);
const candidatePersonId = created.personOrder.find((id) =>
  fixtureMeetsRecordedCandidacyAge(created, id),
);
if (!candidatePersonId) throw new Error("Fixture has no eligible candidate.");
let world = ensureWorldStartingConditions(
  { ...created, control: { kind: "person", personId: candidatePersonId } },
  {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  },
);
const people = world.personOrder.filter((id) => id !== candidatePersonId);
for (const personId of people) {
  world = recordRelationshipInteraction(world, {
    stableKey: `manager-screen:known:${personId}`,
    personIds: [candidatePersonId, personId],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "contact:met-in-community",
    change: "formed",
    significance: "meaningful",
    summary: "They know each other from their community.",
    tags: [],
  });
  world = createWorkRelationship(world, {
    stableKey: `manager-screen:campaign-work:${personId}`,
    personId,
    organizationId: null,
    startedAt: addDays(world.currentDate, -120),
    kind: "volunteer:campaign-staff",
    compensation: "unpaid",
    authority: "shared",
    dependency: "independent",
    economicRisk: "person-borne",
    provenance: { kind: "authored", note: "Campaign-manager screen fixture." },
    initialRole: {
      title: "Campaign volunteer",
      occupationClassification: "service:campaign-volunteer",
      locationJurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 2, maximumHours: 12 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
      },
    },
  });
}
const officeKey = candidacyPackById("us-ky-general-assembly-v1:candidacy")
  ?.offices[0]?.officeKey;
if (!officeKey) throw new Error("Fixture candidacy pack has no office.");
const opponents = ensureCampaignOpponents(world, {
  stableKey: "manager-screen:opponents",
  jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
  count: 1,
  excludePersonIds: [candidatePersonId],
});
const filed = fileCampaign(opponents.world, {
  stableKey: "manager-screen:campaign",
  candidatePersonId,
  jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
  officeKey,
  districtBinding: namedSeatForFixture(world, candidatePersonId, officeKey),
  electionDate: addDays(world.currentDate, 30),
  rivalPersonIds: opponents.personIds,
  existingContestId: null,
  committeeName: "Funded manager screen campaign",
  donorPoolName: "Supporters",
  advertisingVendorName: "Campaign media vendor",
  staffPersonIds: [],
  treasuryCurrency: makeCurrencyCode("USD"),
});
world = filed.world;
const cash = { minorUnits: 1_000_000, currency: makeCurrencyCode("USD") };
if (
  !world.history.resourcePositions.some(
    (row) =>
      row.owner.kind === "person" && row.owner.personId === candidatePersonId,
  )
) {
  world = createResourcePosition(world, {
    stableKey: "manager-screen:candidate-savings",
    owner: { kind: "person", personId: candidatePersonId },
    openedAt: world.currentDate,
    openingBalance: cash,
    provenance: {
      kind: "authored",
      note: "Funded campaign manager UI proof fixture.",
    },
  });
}
world = contributeOwnMoneyToCampaign(world, candidatePersonId, 500_000);
const managerId = campaignManagerCandidates(world, filed.campaign.id)
  .map((row) => row.personId)
  .find(
    (personId) =>
      offerCampaignManager(world, filed.campaign.id, personId).accepted,
  );
if (!managerId)
  throw new Error("Fixture found no campaign manager candidate who accepts.");

document.body.dataset.managerCandidateId = managerId;
function App() {
  const [state, setState] = useState(world);
  return (
    <CampaignWorkspace
      world={state}
      personId={candidatePersonId}
      onWorldChange={setState}
    />
  );
}
createRoot(document.getElementById("root")!).render(<App />);
