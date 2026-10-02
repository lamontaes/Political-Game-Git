import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
  advanceObservedWorld,
} from "../presentation/observer-world";
import type { EntityId } from "./types";
import { recordedCredentialHourlyPay } from "./living-world/town-pay";

it("an ordinary random game's opening or first offers record credential peer sources", () => {
  const seed =
    process.env.A40_OPENING_SEED ?? `a40-active-terms:${randomUUID()}`;
  const place = observerPlace(seed);
  let world = openObserverWorld(observerSetup(seed, place.key)).world;
  const openedAt = world.currentDate;
  console.log(
    JSON.stringify({
      seed,
      place: place.displayName,
      placeKey: place.key,
      openedAt,
    }),
  );
  const matching = () => {
    const pattern =
      /ESTIMATED FROM AVERAGE of [1-9]\d* paid same-occupation\/workplace credential peers/;
    const flows = new Map(
      world.history.resourceFlows.map((flow) => [flow.id, flow]),
    );
    return [...world.history.resourceFlows, ...world.history.resourceFlowTerms]
      .filter(
        (record) =>
          record.provenance.kind === "authored" &&
          pattern.test(record.provenance.note),
      )
      .map((record) => {
        const flow =
          "resourceFlowId" in record
            ? flows.get(record.resourceFlowId)!
            : record;
        const note =
          record.provenance.kind === "authored" ? record.provenance.note : "";
        return {
          recordId: record.id,
          flowId: flow.id,
          startsAt: flow.startsAt,
          recordedAt: flow.recordedAt,
          basis: flow.basisReference,
          note,
          quote:
            flow.basisReference.kind === "work"
              ? recordedCredentialHourlyPay(
                  world,
                  flow.basisReference.workRelationshipId,
                  flow.recordedAt,
                )
              : null,
          sourceRecordIds: note
            .split("source records ")[1]!
            .replace(/\.$/, "")
            .split(", "),
        };
      });
  };
  for (let days = 0; days < 100 && !matching().length; days += 1) {
    world = advanceObservedWorld(world, 1);
    if (days === 6) {
      const cohorts = world.history.workRelationships.flatMap((work) => {
        const quote = recordedCredentialHourlyPay(
          world,
          work.id,
          world.currentDate,
        );
        return quote
          ? [{ workId: work.id, personId: work.personId, ...quote }]
          : [];
      });
      writeFileSync(
        "/tmp/a40-first-payday-cohort-checkpoint.json",
        JSON.stringify(
          { seed, place: place.displayName, date: world.currentDate, cohorts },
          null,
          2,
        ),
      );
      writeFileSync(
        "/tmp/a40-first-payday-existing-world.json",
        JSON.stringify(world),
      );
    }
  }
  const witnesses = matching();
  const receipt = {
    seed,
    place: place.displayName,
    placeKey: place.key,
    openedAt,
    through: world.currentDate,
    flows: world.history.resourceFlows.length,
    witnesses,
  };
  writeFileSync(
    "/tmp/a40-active-terms-opening-receipt.json",
    JSON.stringify(receipt, null, 2),
  );
  console.log(JSON.stringify(receipt));
  expect(witnesses.length).toBeGreaterThan(0);
  const records = new Map(
    [
      ...world.history.workRelationships,
      ...world.history.workStatuses,
      ...world.history.workRoles,
      ...world.history.resourceFlows,
      ...world.history.resourceFlowTerms,
      ...world.history.educationEnrollments,
      ...world.history.educationEnrollmentStates,
    ].map((row) => [row.id, row]),
  );
  for (const witness of witnesses) {
    expect(witness.note).toContain("source records ");
    expect(witness.quote?.peerCount).toBeGreaterThan(0);
    expect(witness.quote!.sourceRecordIds.length).toBeGreaterThan(0);
    expect(witness.sourceRecordIds.length).toBeGreaterThan(0);
    for (const id of witness.sourceRecordIds)
      expect(records.has(id as EntityId)).toBe(true);
  }
}, 300_000);
