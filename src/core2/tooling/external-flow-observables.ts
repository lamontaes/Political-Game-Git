/** Developer accounting: outside owners keep flows and zero liquid cash. */
import { makeIsoDate } from "../../simulation/dates";
import { parameter } from "../parameters";
import type { CoreState } from "../types";

export function externalFlowObservables(core: CoreState) {
  const zero = parameter("zero", core.data.parameters);
  let incoming = BigInt(zero),
    outgoing = BigInt(zero);
  const byOwner = [...core.cashJournal.externalFlowsByOwner]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ownerId, totals]) => {
      const owner = core.organizations.get(ownerId);
      const source = owner?.outsideFlow;
      if (
        !owner ||
        !source ||
        owner.liquidMinor !== zero ||
        !["SOURCED", "ESTIMATED"].includes(source.tag) ||
        !source.citation.trim() ||
        makeIsoDate(source.asOf) > core.date ||
        !Number.isSafeInteger(totals.incomingMinor) ||
        totals.incomingMinor < zero ||
        !Number.isSafeInteger(totals.outgoingMinor) ||
        totals.outgoingMinor < zero ||
        !Number.isSafeInteger(totals.netMinor) ||
        BigInt(totals.netMinor) !==
          BigInt(totals.incomingMinor) - BigInt(totals.outgoingMinor)
      )
        throw new Error(
          "Outside flow observation lacks its actual zero-stock owner.",
        );
      incoming += BigInt(totals.incomingMinor);
      outgoing += BigInt(totals.outgoingMinor);
      return { ownerId, ...totals, source: { ...source } };
    });
  for (const owner of core.organizations.values())
    if (
      owner.outsideFlow &&
      !core.cashJournal.externalFlowsByOwner.has(owner.id)
    )
      throw new Error("Outside owner has no recorded flow ledger.");
  const incomingMinor = Number(incoming),
    outgoingMinor = Number(outgoing),
    netMinor = Number(incoming - outgoing);
  if (![incomingMinor, outgoingMinor, netMinor].every(Number.isSafeInteger))
    throw new Error("Outside flow observations overflow exact minor units.");
  return {
    ownerCount: byOwner.length,
    incomingMinor,
    outgoingMinor,
    netMinor,
    netIntoTownMinor: Number(outgoing - incoming),
    byOwner,
    scope:
      "Actual outside-owner cumulative incoming and outgoing flows; incoming is paid by the town, outgoing is paid into the town. Outside owners hold zero liquid cash. Gross flows can include payments between outside owners; only net flow changes town cash.",
  };
}
