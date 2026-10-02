import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
  advanceObservedWorld,
} from "../presentation/observer-world";
import { recordedCredentialHourlyPay } from "./living-world/town-pay";

it("an ordinary random game's opening or first offers record credential peer sources", () => {
  const seed = `a40-active-terms:${randomUUID()}`;
  const place = observerPlace(seed);
  let world = openObserverWorld(observerSetup(seed, place.key)).world;
  const openedAt = world.currentDate;
  const matching = () =>
    world.history.resourceFlows.filter(
      (flow) =>
        flow.provenance.kind === "authored" &&
        /ESTIMATED FROM AVERAGE of [1-9]\d* paid same-occupation\/workplace credential peers/.test(
          flow.provenance.note,
        ),
    );
  for (let days = 0; days < 100 && !matching().length; days += 1)
    world = advanceObservedWorld(world, 1);
  const witnesses = matching().map((flow) => {
    const quote =
      flow.basisReference.kind === "work"
        ? recordedCredentialHourlyPay(
            world,
            flow.basisReference.workRelationshipId,
            flow.startsAt,
          )
        : null;
    return {
      flowId: flow.id,
      startsAt: flow.startsAt,
      basis: flow.basisReference,
      note: flow.provenance.kind === "authored" ? flow.provenance.note : null,
      quote,
    };
  });
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
  for (const witness of witnesses) {
    expect(witness.note).toContain("source records ");
    expect(witness.quote?.peerCount).toBeGreaterThan(0);
    expect(witness.quote!.sourceRecordIds.length).toBeGreaterThan(0);
    for (const id of witness.quote!.sourceRecordIds)
      expect(witness.note).toContain(id);
  }
}, 300_000);
