import { describe, expect, it } from "vitest";
import { addDays } from "../../src/simulation/dates";
import { deserializeWorld, serializeWorld } from "../../src/simulation";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../../src/simulation/municipal-government";
import { municipalSeats } from "../../src/simulation/municipal-public-work";
import { requireLifePlace } from "../../src/simulation/life-places";
import { localGoverningBodiesForJurisdiction } from "../../src/simulation/candidacy";
import { organizationParticipationStateAt } from "../../src/simulation/life-queries";
import { fileForOffice } from "../../src/presentation/campaign-projection";
import { localGoverningSeatFor } from "../../src/presentation/local-governing-seat";
import {
  adultLifeAt,
  runToElection,
  suppliedWin,
} from "../fixtures/state-executive-entry";

describe("fictional municipal opening turnover", () => {
  it("yields one generated seat to a local election winner and preserves the roster on reload", () => {
    const place = requireLifePlace("2108902");
    const government = municipalGovernmentForLifePlace(place)!;
    const { world, personId } = adultLifeAt(
      place.key,
      "municipal-council-turnover-bowling-green",
    );
    const before = municipalSeats(world, government.key).filter(
      (seat) => seat.role === "member",
    );
    expect(before).toHaveLength(primaryReading(government).bodySize!);
    const office = localGoverningBodiesForJurisdiction(
      place.context.jurisdiction.id,
    ).find((candidate) => candidate.seat === "governing-body")!;
    const filed = fileForOffice(
      world,
      personId,
      null,
      office.officeKey,
      addDays(world.currentDate, 28),
    );
    const won = runToElection(filed, personId, suppliedWin(personId));
    expect(localGoverningSeatFor(won, personId)).not.toBeNull();
    const after = municipalSeats(won, government.key).filter(
      (seat) => seat.role === "member",
    );
    expect(after).toHaveLength(before.length);
    expect(after.some((seat) => seat.personId === personId)).toBe(true);
    const displaced = before.filter(
      (seat) => !after.some((current) => current.personId === seat.personId),
    );
    expect(displaced).toHaveLength(1);
    expect(
      organizationParticipationStateAt(won, displaced[0]!.participationId)
        ?.status,
    ).toBe("ended");
    const reloaded = deserializeWorld(serializeWorld(won));
    expect(municipalSeats(reloaded, government.key)).toEqual(
      municipalSeats(won, government.key),
    );
  }, 60_000);
});
