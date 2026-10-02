import { writeFileSync } from "node:fs";
import { smallWorld } from "./small-world";
import { FIXTURE, NO_ACTION } from "./public-program-fixture";
import { drawRandomPlace } from "../support/random-place";
import { addDays } from "../../src/simulation/dates";
import { PROGRAM_FAMILIES } from "../../src/simulation/governing/program-families";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programCommitments,
  recordProgramAppropriation,
} from "../../src/simulation/governing/public-program";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../../src/simulation/nationwide-world/state-executives";
import { money } from "../../src/simulation/resources";
import { serializeWorld } from "../../src/simulation/serialization";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "../../src/simulation/tax-policy";

// Authored service and appropriation controls, not a natural budget decision.
const seed = "team8-program-decision-news-all56";
const place = drawRandomPlace(seed);
const fixture = smallWorld({ place: place.key, seed });
const family = PROGRAM_FAMILIES.find(
  (candidate) => candidate.familyKey === "disaster-recovery",
);
if (!family) throw new Error("The canonical recovery family is unavailable.");
const programKey = `${family.familyKey}:${place.stateJurisdictionKey!.toLowerCase()}`;
const serviceLabel = "Regional crisis response";
let world = ensureStateExecutiveIncumbent(
  fixture.world,
  fixture.personId,
  fixture.stateUsps,
);
const official = currentStateExecutiveHolders(world).find(
  (holder) => holder.stateUsps === fixture.stateUsps,
);
if (!official) throw new Error("No canonical executive was recorded.");
world = ensurePublicGovernmentAccount(world, {
  kind: "jurisdiction",
  jurisdictionId: fixture.stateJurisdictionId,
});
const account = publicTaxAccountForJurisdiction(
  world,
  fixture.stateJurisdictionId,
);
if (!account) throw new Error("No canonical government account was recorded.");
world = declareProgramCapacity(world, {
  edition: "news-browser-fixture",
  programKey,
  jurisdictionId: fixture.stateJurisdictionId,
  publicGovernmentIdentity: {
    kind: "jurisdiction",
    jurisdictionId: fixture.stateJurisdictionId,
  },
  serviceLabel,
  unitLabel: "service units",
  unitsTotal: 2,
  unitsOperational: 1,
  monthlyOperatingNeed: money(100, "USD"),
  completedPermille: null,
  restorationCostPerUnit: money(100, "USD"),
  basis: FIXTURE,
}).world;
const adopted = recordProgramAppropriation(world, {
  edition: "news-browser-fixture",
  programKey,
  jurisdictionId: fixture.stateJurisdictionId,
  accountOrganizationId: account.organizationId,
  amount: money(100_000, "USD"),
  availableFrom: world.currentDate,
  availableThrough: addDays(world.currentDate, 30),
  basis: FIXTURE,
});
const result = commitPublicProgram(adopted.world, {
  appropriationId: adopted.id,
  alternative: NO_ACTION,
  personId: official.personId,
  office: { kind: "state-executive" },
  recipientOrganizationId: null,
});
if (!result.ok) throw new Error(result.reason);
const commitment = programCommitments(result.world, programKey).find(
  (record) => record.id === result.recordId,
);
if (!commitment) throw new Error("No commitment record was saved.");
const event = result.world.history.events.find(
  (record) => record.id === commitment.eventId,
);
if (!event) throw new Error("No commitment event was saved.");
const output = process.argv[2];
if (!output) throw new Error("Supply a serialized-world output path.");
writeFileSync(output, serializeWorld(result.world));
process.stdout.write(
  JSON.stringify({
    seed,
    place: place.displayName,
    eventId: event.id,
    summary: event.summary,
    serviceLabel,
    programKey,
  }),
);
