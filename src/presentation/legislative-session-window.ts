import { makeIsoDate, type IsoDate } from "../simulation";
import type {
  LegislativeRulePack,
  RuleSourceRef,
} from "../simulation/legislature-rules";

/** Applies only an explicitly sourced outer limit, never parses explanatory prose. */
export function regularSessionWindow(
  pack: LegislativeRulePack,
  onDate: IsoDate,
):
  | { readonly kind: "unresolved" }
  | {
      readonly kind: "within-outer-limit" | "past-outer-limit";
      readonly deadline: IsoDate;
      readonly source: RuleSourceRef;
    } {
  const limit = pack.session.regularSessionLatestAdjournment;
  if (!limit) return { kind: "unresolved" };
  const year = Number(onDate.slice(0, 4));
  const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
  const deadline = makeIsoDate(
    `${year}-${String(boundary.month).padStart(2, "0")}-${String(boundary.day).padStart(2, "0")}`,
  );
  return {
    kind: onDate > deadline ? "past-outer-limit" : "within-outer-limit",
    deadline,
    source: limit.source,
  };
}

/** Current records contain no extraordinary-session proclamation/subject authority. */
export function regularSessionActionRefusal(
  pack: LegislativeRulePack,
  onDate: IsoDate,
): string | null {
  const window = regularSessionWindow(pack, onDate);
  return window.kind === "past-outer-limit"
    ? `The configured regular session cannot continue after ${window.deadline} (${window.source.citation}). No exceptional-session record authorizes this action.`
    : null;
}

/** A declared availability refusal, distinct from an unexpected writer failure. */
export class RegularSessionUnavailableError extends Error {}
