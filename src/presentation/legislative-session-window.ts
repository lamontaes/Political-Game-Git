import type { IsoDate } from "../simulation";
import type { LegislativeRulePack } from "../simulation/legislature-rules";
import {
  regularSessionDateStatus,
  regularSessionRefusalText,
} from "../simulation/legislative-procedure-world";

/** Reads the saved World's executable date rule without parsing explanatory prose. */
export function regularSessionWindow(
  pack: LegislativeRulePack,
  onDate: IsoDate,
): ReturnType<typeof regularSessionDateStatus> {
  return regularSessionDateStatus(pack, onDate);
}

/** Current records contain no extraordinary-session proclamation/subject authority. */
export function regularSessionActionRefusal(
  pack: LegislativeRulePack,
  onDate: IsoDate,
): string | null {
  return regularSessionRefusalText(pack, onDate);
}

/** A declared availability refusal, distinct from an unexpected writer failure. */
export class RegularSessionUnavailableError extends Error {}
