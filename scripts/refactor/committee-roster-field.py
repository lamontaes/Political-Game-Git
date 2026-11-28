#!/usr/bin/env python3
"""
Lawmaking item 7 (LW3), family two: the committee roster the leadership engine
gives the legislature moves from a single-slot registry onto the CoreModule field
`committeeRoster` that the leadership module carries, read with fieldsOf through
legislature.ts's `carried`. registerCommitteeRosterProvider goes.

  python3 scripts/refactor/committee-roster-field.py          rewrite the files
  python3 scripts/refactor/committee-roster-field.py --check  exit 1 if not yet moved

Re-runnable: it does nothing when the field is already carried.
"""
import re
import sys

LEG = "src/core2/modules/legislature.ts"
LEAD = "src/core2/modules/leadership.ts"
leg = open(LEG).read()
lead = open(LEAD).read()
if "committeeRoster: (api, chamber, committee)" in lead:
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


leg = drop(leg, "type RosterProvider = (", "  rosterProvider = fn;\n}\n")
assert leg.count("rosterProvider?.(") == 2
leg = leg.replace("rosterProvider?.(", 'carried(api, "committeeRoster")?.(')
leg = once(
    leg,
    '    | "weeklyFloorReader",\n>(api: CoreAPI, field: K) {',
    '    | "weeklyFloorReader"\n    | "committeeRoster",\n>(api: CoreAPI, field: K) {',
)
leg = once(
    leg,
    " * What the world's legislating carries as a field for this legislature (its\n * floor days, sittings and weeks): the first carrier's value, or undefined\n * where no installed module carries it.",
    " * What the engines that feed the legislature carry as a field (the world's\n * legislating: its floor days, sittings and weeks; the leadership: the\n * committees' rosters): the first carrier's value, or undefined where no\n * installed module carries it.",
)

lead = once(
    lead,
    '''export function openLeadership(core: CoreState): void {
  registerCommitteeRosterProvider((api, chamber, committee) =>
    api.state.modules.has(LEADERSHIP_MODULE_ID)
      ? committeeRoster(api, chamber, committee)
      : null,
  );
  if''',
    "export function openLeadership(core: CoreState): void {\n  if",
)
lead = once(
    lead,
    "      choices: {},\n    },\n  },\n};\n",
    "      choices: {},\n    },\n  },\n  // The legislature seats a committee from the roster leadership kept.\n  committeeRoster: (api, chamber, committee) =>\n    committeeRoster(api, chamber, committee),\n};\n",
)
lead = re.sub(r"\n?  registerCommitteeRosterProvider,\n", "\n", lead, count=1)
open(LEG, "w").write(leg)
open(LEAD, "w").write(lead)
print("moved committeeRoster onto a field the leadership module carries")
