#!/usr/bin/env python3
"""
Lawmaking item 7 (LW3), family one: the four readers the world's legislating gives
the legislature (sittingReader, weeklyFloorReader, floorDateReader, floorCalendarer)
move from single-slot registries onto CoreModule fields the world-legislating module
carries, read with fieldsOf (module-fields.ts). The four register* functions go.

  python3 scripts/refactor/floor-readers-fields.py          rewrite the files
  python3 scripts/refactor/floor-readers-fields.py --check  exit 1 if not yet moved

Re-runnable: it does nothing when the fields are already carried.
"""
import re
import sys

LEG = "src/core2/modules/legislature.ts"
WL = "src/core2/modules/world-legislating.ts"
leg = open(LEG).read()
wl = open(WL).read()
if "sittingReader: nextSitting" in wl:
    print("already moved")
    sys.exit(0)
if "--check" in sys.argv:
    print("not moved")
    sys.exit(1)


def once(text, old, new):
    assert text.count(old) == 1, (text.count(old), old[:80])
    return text.replace(old, new, 1)


def drop(text, start, end):
    i = text.index(start)
    j = text.index(end, i) + len(end)
    return text[:i] + text[j:]


# ---- legislature.ts: the readers
leg = once(
    leg,
    "  const on = floorCalendarer?.(api, titled.id) ?? null;",
    '  const on = carried(api, "floorCalendarer")?.(api, titled.id) ?? null;',
)
leg = once(
    leg,
    "    const on = sittingReader?.(api, bill.bodyOfficeId)\n",
    '    const on = carried(api, "sittingReader")?.(api, bill.bodyOfficeId)\n',
)
leg = once(
    leg,
    "  return sittingReader?.(api, bodyOfficeId) ?? null;",
    '  return (\n    (carried(api, "sittingReader")?.(api, bodyOfficeId) as\n      | Sitting\n      | null\n      | undefined) ?? null\n  );',
)
leg = once(
    leg,
    "  return floorDateReader?.(api, billId) ?? null;",
    '  return carried(api, "floorDateReader")?.(api, billId) ?? null;',
)
leg = once(
    leg,
    "  return (sittingReader?.(api, bodyOfficeId) ?? null) !== null;",
    '  return (carried(api, "sittingReader")?.(api, bodyOfficeId) ?? null) !== null;',
)
leg = once(
    leg,
    "  let sitting = sittingReader?.(api, bill.bodyOfficeId) ?? null;",
    '  let sitting =\n    (carried(api, "sittingReader")?.(api, bill.bodyOfficeId) as\n      | Sitting\n      | null\n      | undefined) ?? null;',
)
leg = once(
    leg,
    "    const later = sittingReader?.(api, bill.bodyOfficeId, sitting.date) ?? null;",
    '    const later =\n      (carried(api, "sittingReader")?.(\n        api,\n        bill.bodyOfficeId,\n        sitting.date,\n      ) as Sitting | null | undefined) ?? null;',
)
leg = once(
    leg,
    "    ...(weeklyFloorReader?.(api, date) ?? []),",
    '    ...(carried(api, "weeklyFloorReader")?.(api, date) ?? []),',
)
# the module variables and their register functions go
leg = drop(leg, "let floorCalendarer:", "  floorCalendarer = calendarer;\n}\n")
leg = drop(leg, "let sittingReader:", "  sittingReader = reader;\n}\n")
leg = drop(leg, "let floorDateReader:", "  floorDateReader = reader;\n}\n")
leg = drop(leg, "let weeklyFloorReader:", "  weeklyFloorReader = reader;\n}\n")
# the one reader for what the world's legislating carries
leg = once(
    leg,
    'export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";',
    '''export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";

/**
 * What the world's legislating carries as a field for this legislature (its
 * floor days, sittings and weeks): the first carrier's value, or undefined
 * where no installed module carries it.
 */
function carried<
  K extends
    | "floorCalendarer"
    | "sittingReader"
    | "floorDateReader"
    | "weeklyFloorReader",
>(api: CoreAPI, field: K) {
  return fieldsOf(api.state as CoreState, field)[0];
}''',
)
leg = once(leg, 'import { campaignParameter } from "../campaign-data";', 'import { campaignParameter } from "../campaign-data";\nimport { fieldsOf } from "../module-fields";')

# ---- world-legislating.ts: carry them
for name in ("registerSittingReader", "registerWeeklyFloorReader", "registerFloorDateReader", "registerFloorCalendarer"):
    wl = once(wl, f"  {name},\n", "")
    wl = re.sub(rf"  {name}\([A-Za-z]+\);\n", "", wl, count=1)
wl = once(
    wl,
    "  onCalendarWork: (api, work) => onWork(api, work),\n};\n\n/** Register the module and put the state's session ends on the calendar. */",
    "  onCalendarWork: (api, work) => onWork(api, work),\n  // What the legislature reads from the world's legislating: when a body sits\n  // next, which week's floor days, the floor date a bill is on and the one it\n  // is given.\n  sittingReader: nextSitting,\n  weeklyFloorReader: weeklyFloorOn,\n  floorDateReader: floorDateOf,\n  floorCalendarer: projectedFloorDate,\n};\n\n/** Register the module and put the state's session ends on the calendar. */",
)
open(LEG, "w").write(leg)
open(WL, "w").write(wl)
print("moved sittingReader, weeklyFloorReader, floorDateReader and floorCalendarer onto fields")
