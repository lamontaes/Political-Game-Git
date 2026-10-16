/**
 * A government that keeps no treasury at its own scale in this world (the
 * federal government, another state's) as an outside party: it pays its own
 * officials and receives what escheats to it, recorded as an outside flow on
 * the journal. Stopgap
 * SG-CORE-outside-governments covers it until every government that
 * acts here keeps a treasury.
 */
import type { CoreAPI, Source } from "./types";

export function outsideGovernment(api: CoreAPI, governmentKey: string): string {
  const id = `organization:outside-government:${governmentKey}`;
  if (!api.state.organizations.has(id)) {
    // stopgapId: SG-CORE-outside-governments
    api.stopgap("SG-CORE-outside-governments");
    const source: Source = {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `The ${governmentKey} government, whose treasury this world does not keep.`,
      estimatedFrom: "SG-CORE-outside-governments",
    };
    api.addOrganization({
      id,
      placeId: governmentKey,
      name: governmentKey,
      kind: "government-outside",
      liquidMinor: 0,
      outsideFlow: source,
      source,
    });
  }
  return id;
}
