import { officialOf } from "../core2/modules/officials";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { officeWords } from "../english/said-as";

/**
 * The office a person holds as the said-as reader words it: the officials
 * engine's office kind, and for a chamber's presiding officer the role
 * (`<office kind>:presiding`, "Speaker") when the words hold one for their
 * body. A file of its own so a composer that only needs the office (an
 * address naming the Vice President) does not import the whole said person,
 * which reads the journal and so the address composers (an import cycle).
 */
export function officeKindSaid(
  core: Readonly<CoreState>,
  personId: string,
): string | undefined {
  const official = officialOf(coreAPI(core as CoreState), personId);
  return official?.leadership === "presiding" &&
    officeWords(`${official.officeKind}:presiding`)
    ? `${official.officeKind}:presiding`
    : official?.officeKind;
}
