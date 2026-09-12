import { candidacyPackForJurisdiction } from "../../src/simulation";
import type {
  DistrictSeatBinding,
  EntityId,
  World,
} from "../../src/simulation";
import { gazetteerChamberForOfficeChamberKey } from "../../src/districts/query";
import { fileForOffice as fileSelectedOffice } from "../../src/presentation/campaign-projection";

/** Legacy scenario fixtures deliberately name their intended provider office.
 * Production callers must supply an explicit office key; this is not UI policy.
 */
export function fileForOffice(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding | null = null,
): World {
  const offices =
    candidacyPackForJurisdiction(world.people[personId]!.homeJurisdictionId)
      ?.offices ?? [];
  const option = binding
    ? offices.find(
        (office) =>
          gazetteerChamberForOfficeChamberKey(
            office.officeKey.split(":").at(-1)!,
          ) === binding.chamber,
      )
    : offices.at(0);
  return fileSelectedOffice(
    world,
    personId,
    binding,
    option?.officeKey ?? "fixture:no-supported-office",
  );
}
