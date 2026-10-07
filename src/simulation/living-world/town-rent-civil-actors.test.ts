/// <reference types="node" />
import { courtFor } from "../judiciary/court-for";
import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../future-transitions";
import { lifePlaceByKey } from "../life-places";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { personName } from "../people";
import { resourcePositionAt } from "../resource-queries";
import { createResourcePosition, money } from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { withWorldIntegrityDeferred } from "../world";
import {
  seatsForCourt,
  seatHolderAt,
  seatJudge,
  vacateJudicialSeat,
} from "../judiciary/courts";
import type { World } from "../types";
import {
  collectTownRent,
  hudRentRowFor,
  RENT_EVENTS,
  startTownLeases,
  townLeases,
  TOWN_RENT_VERSION,
} from "./town-rent";

const SEED = "team9-a102-saved-civil-actors";
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A102_PROOF_PATH)
    writeFileSync(
      process.env.A102_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});
const largest = new Map<string, [string, number]>();
for (const entry of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = entry.split(":") as [string, string];
  const place = lifePlaceByKey(key);
  if (
    !place?.stateJurisdictionKey ||
    !hudRentRowFor(place.context.jurisdiction.id)
  )
    continue;
  if ((largest.get(place.stateJurisdictionKey)?.[1] ?? -1) < Number(count))
    largest.set(place.stateJurisdictionKey, [key, Number(count)]);
}
const available = [...largest.values()].map(([key]) => key);
const rng = new SeededRng(SEED);
const places = Array.from(
  { length: 5 },
  () => available.splice(rng.integer(0, available.length), 1)[0]!,
);
function atDate(world: World, date: string): World {
  const day = makeIsoDate(date);
  return {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
}
function followingMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${month === 12 ? year! + 1 : year}-${String(month === 12 ? 1 : month! + 1).padStart(2, "0")}-01`;
}

describe("A102 existing eviction filings require actual court actors", () => {
  it.each(places)(
    "keeps an unseated case pending and admits only the saved judge in %s",
    (placeKey) => {
      const prepared = withWorldIntegrityDeferred(() => {
        const game = generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            placeKey,
            seed: `${SEED}:${placeKey}`,
            startAge: 24,
            questionnaire: "skipped",
          }),
        ).game!;
        let world = startTownLeases(game.world, game.world.currentDate);
        // Isolate direct writer fixtures without claiming that scheduled play ran.
        // Preserve due items and append cancellation through their existing writer.
        for (const item of world.history.futureDueItems ?? []) {
          if (
            futureDueItemStateAt(world, item.id, {
              asOfDate: world.currentDate,
              historySequenceExclusive: world.history.nextSequence,
            })?.status !== "scheduled"
          )
            continue;
          world = cancelFutureDueItem(world, {
            stableKey: `a102:fixture-cancel:${item.id}`,
            dueItemId: item.id,
            effectiveAt: world.currentDate,
            reasonKey: "fixture:isolated-civil-writer",
            context:
              "Controlled direct rent writer fixture; scheduled world activities are not simulated.",
          });
        }
        const place = lifePlaceByKey(placeKey)!;
        const lease = townLeases(world).find(
          (row) =>
            row.town === place.context.jurisdiction.id &&
            row.regime === "market" &&
            !resourcePositionAt(
              world,
              { kind: "person", personId: row.leaseholderId },
              money(0, "USD").currency,
            ),
        );
        expect(lease, placeKey).toBeDefined();
        const court = courtFor(
          world,
          lease!.town,
          "local-general-trial",
          "civil",
        );
        expect(court).not.toBeNull();
        const courtId = court!.courtId;
        const seats = seatsForCourt(world, courtId);
        const seated = seats
          .map((seat) => seatHolderAt(world, seat.seatId))
          .filter((holder) => holder !== null);
        expect(seated.length).toBeGreaterThan(0);
        const originalJudge = seated[0]!;
        // Controlled vacancy uses the actual tenure writer, retaining its history.
        for (const holder of seated)
          world = vacateJudicialSeat(world, {
            seatId: holder.seatId,
            vacatedAt: world.currentDate,
            reason: "resignation",
          });
        world = createResourcePosition(world, {
          stableKey: `a102:${lease!.flow.id}:zero-cash`,
          owner: { kind: "person", personId: lease!.leaseholderId },
          openedAt: world.currentDate,
          openingBalance: money(0, "USD"),
          provenance: {
            kind: "authored",
            note: "Controlled missed-rent fixture; no payment or counsel is inferred.",
          },
        });
        const tag = `${TOWN_RENT_VERSION}:lease:${lease!.flow.id}`;
        const events = (w: World) =>
          w.history.events.filter((event) => event.tags.includes(tag));
        let date = followingMonth(world.currentDate);
        for (
          let month = 0;
          month < 6 &&
          !events(world).some((event) => event.type === RENT_EVENTS.filed);
          month++
        ) {
          world = collectTownRent(atDate(world, date), makeIsoDate(date));
          date = followingMonth(date);
        }
        const filing = events(world).find(
          (event) => event.type === RENT_EVENTS.filed,
        );
        expect(filing).toBeDefined();
        expect(filing!.involvedEntityIds).toContain(lease!.householdId);
        expect(
          filing!.participants.some(
            (participant) => participant.personId === lease!.leaseholderId,
          ),
        ).toBe(true);
        const pending = collectTownRent(atDate(world, date), makeIsoDate(date));
        expect(
          events(pending).filter((event) =>
            [RENT_EVENTS.evicted, RENT_EVENTS.settled].includes(
              event.type as typeof RENT_EVENTS.evicted,
            ),
          ),
        ).toHaveLength(0);
        expect(
          townLeases(pending).find((row) => row.flow.id === lease!.flow.id)
            ?.ended,
        ).toBe(false);
        return {
          pending,
          originalJudge,
          events,
          date,
          place,
          lease,
          court,
          filing,
        };
      });
      const {
        pending,
        originalJudge,
        events,
        date,
        place,
        lease,
        court,
        filing,
      } = prepared;
      const reloaded = deserializeWorld(serializeWorld(pending));
      expect(
        serializeWorld(collectTownRent(reloaded, reloaded.currentDate)),
      ).toBe(serializeWorld(pending));
      const appointed = seatJudge(reloaded, {
        seatId: originalJudge.seatId,
        personId: originalJudge.personId,
        startedAt: reloaded.currentDate,
        selection: {
          path: "reappointment",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: "Controlled reappointment of the previously saved actual judge; no election result inferred.",
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
      const holder = seatHolderAt(appointed, originalJudge.seatId);
      expect(holder?.personId).toBe(originalJudge.personId);
      const hearingOn = followingMonth(date);
      const heard = collectTownRent(
        atDate(appointed, hearingOn),
        makeIsoDate(hearingOn),
      );
      const judgment = events(heard).find(
        (event) =>
          event.type === RENT_EVENTS.evicted ||
          event.type === RENT_EVENTS.settled,
      );
      expect(judgment).toBeDefined();
      expect(judgment!.summary).not.toContain("the court");
      for (const id of [
        holder!.personId,
        lease!.flow.id,
        lease!.tenureId,
        lease!.dwellingId,
      ])
        expect(judgment!.involvedEntityIds).toContain(id);
      expect(judgment!.tags).toContain(
        `justice:court-record:${court!.courtId}`,
      );
      expect(judgment!.tags).toContain(`justice:seat-record:${holder!.seatId}`);
      expect(judgment!.tags).toContain(
        `justice:tenure-record:${holder!.tenureId}`,
      );
      expect(judgment!.tags).toContain(`justice:filing-record:${filing!.id}`);
      expect(
        judgment!.participants.some(
          (participant) =>
            participant.role === "focus:judge" &&
            participant.personId === holder!.personId,
        ),
      ).toBe(true);
      expect(judgment!.summary).not.toMatch(
        /A lawyer represented|their lawyer settled|even with a lawyer/,
      );
      expect(
        (judgment as typeof judgment & { lawEffectStamps?: unknown[] })
          ?.lawEffectStamps,
      ).toBeUndefined();
      expect(
        serializeWorld(
          collectTownRent(
            deserializeWorld(serializeWorld(heard)),
            heard.currentDate,
          ),
        ),
      ).toBe(serializeWorld(heard));
      receipts.push({
        seed: SEED,
        placeKey,
        town: place.context.jurisdiction.name,
        tenantId: lease!.leaseholderId,
        tenant: personName(heard.people[lease!.leaseholderId]!),
        leaseFlowId: lease!.flow.id,
        housingTenureId: lease!.tenureId,
        dwellingId: lease!.dwellingId,
        filingId: filing!.id,
        courtId: court!.courtId,
        seatId: holder!.seatId,
        tenureId: holder!.tenureId,
        judgeId: holder!.personId,
        judge: personName(heard.people[holder!.personId]!),
        judgmentId: judgment!.id,
        hearingOn,
        counselAdmission: "missing; no representation inferred",
        fixture:
          "authored vacancy/zero cash/reappointment through existing writers; not natural play",
      });
    },
  );
});
