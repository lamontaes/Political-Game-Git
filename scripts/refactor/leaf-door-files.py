#!/usr/bin/env python3
"""
Lawmaking item 3 follow-up (the Doors session's ask, Nov 27, 12:36): the bodies and
justice door files import nothing at run time, so a reader on the import ring can
import them without joining it. Each door file holds its engines' module ids as
strings (as laws-reads.ts does) and takes the row types with `import type`; each
engine file re-exports its id from the door file.

  python3 scripts/refactor/leaf-door-files.py          rewrite the files
  python3 scripts/refactor/leaf-door-files.py --check  exit 1 if not yet leaf

Re-runnable: it does nothing when the door files already hold the ids.
"""
import sys

BASE = "src/core2/modules/"
bodies = open(BASE + "bodies-reads.ts").read()
justice = open(BASE + "justice-reads.ts").read()
if 'export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";' in bodies:
    print("already leaf")
    sys.exit(0)
if "--check" in sys.argv:
    print("not leaf")
    sys.exit(1)


def once(text, old, new):
    assert text.count(old) == 1, (text.count(old), old[:70])
    return text.replace(old, new, 1)


bodies = once(
    bodies,
    '''import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  type StudyRow,
} from "./legislature";
import { LEADERSHIP_MODULE_ID, type PostRow } from "./leadership";
import {
  MEETINGS_MODULE_ID,
  type DebateRow,
  type RemarkRow,
  type TownHallRow,
} from "./meetings";
''',
    '''import type { BillRow, StudyRow } from "./legislature";
import type { PostRow } from "./leadership";
import type { DebateRow, RemarkRow, TownHallRow } from "./meetings";

/** The bodies engines' module ids; legislature.ts, meetings.ts and leadership.ts re-export them. */
export const LEGISLATURE_MODULE_ID = "core2-legislature-v1";
export const MEETINGS_MODULE_ID = "core2-meetings-v1";
export const LEADERSHIP_MODULE_ID = "core2-leadership-v1";
''',
)
justice = once(
    justice,
    '''import { CORRUPTION_MODULE_ID, type CrimeRecord } from "./corruption";
import { CRIME_MODULE_ID, type CrimeMonth } from "./crime";
import {
  JUSTICE_MODULE_ID,
  type CaseRow,
  type CustodyRow,
  type SentenceRow,
} from "./justice";
''',
    '''import type { CrimeRecord } from "./corruption";
import type { CrimeMonth } from "./crime";
import type { CaseRow, CustodyRow, SentenceRow } from "./justice";

/** The justice engines' module ids; justice.ts, crime.ts and corruption.ts re-export them. */
export const JUSTICE_MODULE_ID = "core2-justice-v1";
export const CRIME_MODULE_ID = "core2-crime-v1";
export const CORRUPTION_MODULE_ID = "corruption";
''',
)
open(BASE + "bodies-reads.ts", "w").write(bodies)
open(BASE + "justice-reads.ts", "w").write(justice)

for file, name, door in (
    ("legislature.ts", "LEGISLATURE_MODULE_ID", "bodies-reads"),
    ("meetings.ts", "MEETINGS_MODULE_ID", "bodies-reads"),
    ("leadership.ts", "LEADERSHIP_MODULE_ID", "bodies-reads"),
    ("justice.ts", "JUSTICE_MODULE_ID", "justice-reads"),
    ("crime.ts", "CRIME_MODULE_ID", "justice-reads"),
    ("corruption.ts", "CORRUPTION_MODULE_ID", "justice-reads"),
):
    text = open(BASE + file).read()
    i = text.index(f"export const {name} = ")
    j = text.index("\n", i) + 1
    text = (
        text[:i]
        + f'// The id lives with the read doors ({door}.ts), which import nothing at run\n// time, so a reader can use the doors without joining the import ring.\nexport {{ {name} }} from "./{door}";\nimport {{ {name} }} from "./{door}";\n'
        + text[j:]
    )
    open(BASE + file, "w").write(text)
print("the bodies and justice door files hold their module ids and import nothing at run time")
