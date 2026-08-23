import { runDemoScenario } from "../simulation";

const seed = process.argv[2];
const result = runDemoScenario(seed);
const materializedPerson = result.world.people[result.materializedPersonId];

const output = {
  seed: result.world.seed,
  worldId: result.world.id,
  snapshotId: result.snapshotId,
  reproducible: result.reproducible,
  currentDate: result.world.currentDate,
  jurisdictionCount: result.world.jurisdictionOrder.length,
  personCount: result.world.personOrder.length,
  eventCount: result.world.history.events.length,
  organizationCount: result.world.history.organizations.length,
  workRelationshipCount: result.world.history.workRelationships.length,
  householdCount: result.world.history.households.length,
  careResponsibilityCount: result.world.history.careResponsibilities.length,
  materializedPerson: materializedPerson
    ? {
        id: materializedPerson.id,
        name: `${materializedPerson.givenName} ${materializedPerson.familyName}`,
        detailLevel: materializedPerson.detailLevel,
      }
    : null,
};

console.log(JSON.stringify(output, null, 2));

if (!result.reproducible) {
  process.exitCode = 1;
}
