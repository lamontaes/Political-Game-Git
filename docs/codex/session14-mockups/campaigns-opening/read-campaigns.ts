import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "./src/presentation/new-game.ts";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "./src/presentation/opening-life.ts";
import { drawRandomPlace } from "./tests/support/random-place.ts";
import { projectCampaign } from "./src/presentation/campaign-projection.ts";
import { projectPartyAndCommunityWork } from "./src/presentation/campaign-life-surface.ts";
import { projectCampaignOffices } from "./src/presentation/campaign-office-discovery.ts";
// The person-linking fields a history record may carry; absent ones are skipped.
interface PersonLinkedRecord {
  personId?: string;
  candidateId?: string;
  candidatePersonId?: string;
  subjectId?: string;
  actorId?: string;
}
const seed = "session14-campaigns-records-20261005";
const place = drawRandomPlace(seed, (p) => p.scope === "locality");
const { world, playerPersonId } = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startAge: 34,
    gender: "female",
    depth: "summarize-earlier-life",
  }),
).game!;
const campaign = projectCampaign(world, playerPersonId);
const party = projectPartyAndCommunityWork(world, playerPersonId);
const offices = projectCampaignOffices(world, playerPersonId);
const contactEvents = world.history.events.filter(
  (e) =>
    e.kind === "contact:met-at-party-event" &&
    e.participants.some((p) => p.personId === playerPersonId),
);
const savedCampaigns = (world.history.campaigns ?? []).filter(
  (c) => c.candidatePersonId === playerPersonId,
);
const supportMetricIds = savedCampaigns.map((c) => c.supportMetricId);
const supportRecords = world.history.metricStates.filter((m) =>
  supportMetricIds.includes(m.metricId),
);
const history = Object.fromEntries(
  Object.entries(world.history)
    .filter(([key]) => /campaign|contact|election|metric/i.test(key))
    .map(([key, value]) => [
      key,
      Array.isArray(value)
        ? (value as PersonLinkedRecord[]).filter((r) =>
            [
              r.personId,
              r.candidateId,
              r.candidatePersonId,
              r.subjectId,
              r.actorId,
            ].includes(playerPersonId),
          )
        : value,
    ]),
);
writeFileSync(
  "/tmp/session14-mockups/campaigns/record-receipt.json",
  JSON.stringify(
    {
      sourceHead: "0d7453f9de2f3dcf14ca75ee24eb4510cf6fa87a",
      seed,
      place,
      playerPersonId,
      date: world.currentDate,
      campaign,
      party,
      offices,
      contactEvents,
      savedCampaigns,
      supportRecords,
      history,
      limitations:
        "Fresh opening world, no campaign filed or advance/injection. Saved record snapshot, not a gameplay screenshot.",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    place: place.displayName,
    name: campaign.candidateName,
    phase: campaign.phase,
    office: campaign.officeTitle,
    date: campaign.electionDate,
    historyKeys: Object.keys(history),
    partyRows: party.rows.length,
    offices,
  }),
);
