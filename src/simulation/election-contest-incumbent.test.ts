import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { governmentUnitJurisdictionId } from "./government-units";
import { addDays } from "./dates";
import {
  contestIncumbentPersonId,
  scheduleElectionContest,
} from "./election-contests";
import { recordOrganizationParticipationState } from "./life";
import { localElectedOffices } from "./nationwide-world/local-governing-body-candidacy-packs";
import {
  homeLocalGovernmentUnits,
  placeLocalGovernmentUnits,
} from "./nationwide-world/local-governments";
import { organizationParticipationStateAt } from "./life-queries";
import { localSeatHolder } from "./living-world/local-elections";
import type { EntityId } from "./types";
import type { LifePlace } from "./life-places";

const SEED = "session24-part1-2026-10-06";

function drawThreeRandomStatePlaces() {
  const states = new Set<string>();
  const places: { place: LifePlace; seed: string }[] = [];
  for (let index = 0; index < 3; index += 1) {
    const placeSeed = index === 0 ? SEED : `${SEED}-${index + 1}`;
    const place = drawRandomPlace(placeSeed, (candidate) => {
      const stateKey = candidate.stateJurisdictionKey;
      if (
        !stateKey ||
        !/^US-[A-Z]{2}$/.test(stateKey) ||
        candidate.scope !== "locality" ||
        states.has(stateKey)
      )
        return false;
      const local = placeLocalGovernmentUnits(candidate);
      return local.municipal.some(
        (unit) => localElectedOffices(unit).length > 0,
      );
    });
    const stateKey = place.stateJurisdictionKey;
    if (!stateKey) throw new Error(`No state key for ${place.displayName}.`);
    states.add(stateKey);
    places.push({ place, seed: placeSeed });
  }
  return places;
}

const PROOF_PLACES = drawThreeRandomStatePlaces();

describe("election contest incumbency", () => {
  it(
    `returns only filed sitting officeholders and clears recorded vacancies in ${PROOF_PLACES.map(({ place, seed }) => `${place.displayName} (${seed})`).join(", ")}`,
    { timeout: 300_000 },
    () => {
      for (const { place, seed } of PROOF_PLACES) {
        const game = generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            seed,
            placeKey: place.key,
            startAge: 24,
            questionnaire: "skipped",
          }),
        ).game;
        if (!game)
          throw new Error(`New game did not open for ${place.displayName}.`);

        const local = homeLocalGovernmentUnits(game.world, game.playerPersonId);
        let fixture:
          | {
              readonly officeKey: string;
              readonly seatKey: string;
              readonly jurisdictionId: EntityId;
              readonly incumbentId: EntityId;
              readonly participationId: EntityId;
            }
          | undefined;
        for (const unit of local.municipal) {
          const offices = localElectedOffices(unit);
          for (const seat of [
            0,
            ...Array.from({ length: 32 }, (_, i) => i + 1),
          ]) {
            const holder = localSeatHolder(game.world, unit, seat);
            if (!holder?.participationId) continue;
            const office = offices.find(
              (candidate) =>
                (seat === 0 && candidate.seat === "chief-executive") ||
                (seat > 0 && candidate.seat === "governing-body"),
            );
            if (!office) continue;
            fixture = {
              officeKey: office.officeKey,
              seatKey: seat === 0 ? "chief-executive" : `seat-${seat}`,
              jurisdictionId: governmentUnitJurisdictionId(unit),
              incumbentId: holder.personId,
              participationId: holder.participationId,
            };
            break;
          }
          if (fixture) break;
        }
        if (!fixture)
          throw new Error(
            `No recorded local officeholder in ${place.displayName}.`,
          );

        const contestWorld = scheduleElectionContest(game.world, {
          stableKey: `${seed}:incumbent-contest`,
          jurisdictionId: fixture.jurisdictionId,
          office: {
            officeKey: fixture.officeKey,
            title: "Recorded local office",
            seatKey: fixture.seatKey,
            occupationClassification: "service:elected-local-official",
          },
          electionDate: addDays(game.world.currentDate, 90),
          candidatePersonIds: [fixture.incumbentId],
          provenance: {
            method: "authored",
            sourceEntityIds: [fixture.incumbentId],
            note: "Focused incumbency reader proof using the actual newly opened officeholder.",
          },
        });
        const contest = contestWorld.history.electionContests?.at(-1);
        if (!contest) throw new Error("Missing scheduled contest record.");
        expect(contestIncumbentPersonId(contestWorld, contest.id)).toBe(
          fixture.incumbentId,
        );

        const previous = organizationParticipationStateAt(
          contestWorld,
          fixture.participationId,
        );
        if (!previous) throw new Error("Missing active seat state.");
        const vacantWorld = recordOrganizationParticipationState(contestWorld, {
          stableKey: `${seed}:incumbent-seat-ended`,
          participationId: fixture.participationId,
          effectiveAt: contestWorld.currentDate,
          status: "ended",
          roleKind: previous.roleKind,
          context: "The recorded office term ended in the vacancy test.",
          provenance: { kind: "authored", note: "Focused vacancy test." },
          supersedesStateId: previous.id,
        });
        expect(contestIncumbentPersonId(vacantWorld, contest.id)).toBeNull();
        console.info(
          "SESSION24_PART1_NEW_GAME",
          JSON.stringify({
            seed,
            place: place.displayName,
            placeKey: place.key,
            state: place.stateJurisdictionKey,
            worldId: game.world.id,
            officeKey: fixture.officeKey,
            seatKey: fixture.seatKey,
            incumbentPersonId: fixture.incumbentId,
            contestId: contest.id,
            incumbentRead: contestIncumbentPersonId(contestWorld, contest.id),
            afterRecordedVacancy: contestIncumbentPersonId(
              vacantWorld,
              contest.id,
            ),
          }),
        );
      }
    },
  );
});
