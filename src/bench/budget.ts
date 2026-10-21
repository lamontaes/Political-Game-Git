import { coreAPI } from "../core2/state";
import {
  budgetPriorities,
  budgetsOf,
  governments,
  setBudgetPriorities,
  withholdingOf,
} from "../core2/modules/budgets";
import type { TermRow } from "../core2/modules/offices";
import type { CoreState } from "../core2/types";
import { properName } from "../director/words";
import lineNames from "../core2/data/budgets/line-names.json" with { type: "json" };

const NAMES = lineNames.lines as Record<string, { name: string }>;

const OFFICES = "core2-offices-v1";
const EXECUTIVES = /^(mayor|governor|county-executive|president)$/;

/** The governments whose executive the person is, by jurisdiction. */
function executiveOf(core: CoreState, personId: string): Set<string> {
  const offices = coreAPI(core).moduleState(OFFICES);
  const out = new Set<string>();
  for (const term of offices
    .table("terms")
    .query("byPerson", [personId]) as unknown as TermRow[]) {
    if (term.status !== "serving") continue;
    const office = offices.table("offices").get(term.officeId) as
      { kind: string; jurisdiction: string } | undefined;
    if (office && EXECUTIVES.test(office.kind)) out.add(office.jurisdiction);
  }
  return out;
}

/** A budget line with the name its source table gives it; a line with no name is a defect the budget test lists. */
export const lineName = (line: string): string | undefined => NAMES[line]?.name;

const sorted = (lines: Readonly<Record<string, number>>) =>
  Object.entries(lines)
    .map(([line, minor]) => ({ line, name: lineName(line), minor }))
    .sort((a, b) => b.minor - a.minor);

/** Every government over the town, its latest budget, and the player's taxes. */
export function budgetView(core: CoreState, personId: string) {
  if (!core.modules.has("core2-budgets-v1"))
    return { governments: [], withholding: null };
  const api = coreAPI(core);
  const executive = executiveOf(core, personId);
  const withheld = withholdingOf(api, personId);
  const byLine: Record<string, number> = {};
  for (const row of withheld)
    for (const line of row.lines) {
      const key = `${line.level} ${line.tax}`;
      byLine[key] = (byLine[key] ?? 0) + line.minor;
    }
  return {
    governments: governments(api).map((gov) => {
      const latest = [...budgetsOf(api, gov.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      )[0];
      return {
        ...gov,
        // Some federal files hold names in capitals only.
        name: properName(gov.name),
        youAreExecutive: [...executive].some((j) => gov.id.includes(j)),
        priorities: budgetPriorities(api, gov.id),
        latest: latest && {
          fiscalYear: latest.fiscalYear,
          adoptedOn: latest.adoptedOn,
          adoptedBy: latest.adoptedBy,
          revenue: sorted(latest.revenueMinor),
          spending: sorted(latest.spendingMinor),
        },
      };
    }),
    withholding: {
      paychecks: withheld.length,
      byLine,
    },
  };
}

/** The executive's priority for the next budget: a change to one line. */
export function setPriority(
  core: CoreState,
  personId: string,
  governmentId: string,
  line: string,
  changeMinor: number,
) {
  const view = budgetView(core, personId);
  const gov = view.governments.find((row) => row.id === governmentId);
  if (!gov?.youAreExecutive)
    throw new Error("Only the executive sets budget priorities.");
  const api = coreAPI(core);
  const changes = {
    ...(budgetPriorities(api, governmentId)?.changes ?? {}),
    [line]: changeMinor,
  };
  setBudgetPriorities(api, { governmentId, setBy: personId, changes });
  return budgetPriorities(api, governmentId);
}
