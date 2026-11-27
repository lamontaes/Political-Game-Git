#!/usr/bin/env python3
"""Economy item 5, family 3: the work engine's side registry of readers of an
office's hours becomes the field `officeTime` the carrying modules hold
(world legislating's, for a town body's meetings; the state office day's, for
a state legislator's session days), read through module-fields.ts (Core item
10, #10768). Re-runnable: each edit prints applied, already or MISSED, and a
miss exits 1 without writing that file."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
missed = []

def edit(path, pairs, imports=()):
    p = ROOT / path
    out = p.read_text()
    bad = False
    for n, (old, new) in enumerate(pairs, 1):
        if old in out:
            out = out.replace(old, new, 1)
            print(f"applied  {path} edit {n}")
        elif new == "" or new in out:
            print(f"already  {path} edit {n}")
        else:
            print(f"MISSED   {path} edit {n}")
            missed.append((path, n))
            bad = True
    if bad:
        return
    for line in imports:
        if line not in out:
            ms = list(re.finditer(r"^import [^;]*?;\n", out, re.M | re.S))
            at = ms[-1].end() if ms else 0
            out = out[:at] + line + "\n" + out[at:]
            print(f"applied  {path} import {line[:50]}")
    p.write_text(out)

edit("src/core2/modules/work.ts", [
    ("""export type OfficeTimeReader = (
  api: CoreAPI,
) => ReadonlyMap<string, OfficeTime>;
""", ""),
    ("""const officeTimeReaders: OfficeTimeReader[] = [];
export function registerOfficeTime(reader: OfficeTimeReader): void {
  if (!officeTimeReaders.includes(reader)) officeTimeReaders.push(reader);
}
""", ""),
    ("""  for (const reader of officeTimeReaders)
    for (const [personId, time] of reader(api)) {""", """  for (const reader of fieldsOf(api.state, "officeTime"))
    for (const [personId, time] of reader(api) as ReadonlyMap<
      string,
      OfficeTime
    >) {"""),
    (" * salaried post's weekday. Each engine that keeps an office's days registers\n * one; a person's office time is the sum of what each says.", " * salaried post's weekday. Each engine's module that keeps an office's days\n * carries one (`officeTime`); a person's office time is the sum of what each\n * says."),
], imports=['import { fieldsOf } from "../module-fields";'])

edit("src/core2/modules/world-legislating.ts", [
    ('import { registerOfficeTime, type OfficeTime } from "./work";', 'import type { OfficeTime } from "./work";'),
    ("  registerOfficeTime(townMeetingHoursToday);\n", ""),
    ("export const WORLD_LEGISLATING_MODULE: CoreModule = {\n  id: WORLD_LEGISLATING_MODULE_ID,\n", "export const WORLD_LEGISLATING_MODULE: CoreModule = {\n  id: WORLD_LEGISLATING_MODULE_ID,\n  // The hours a town body's meetings take from its members' days.\n  officeTime: townMeetingHoursToday,\n"),
])
edit("src/core2/office-day-state.ts", [
    ("  registerOfficeTime,\n", ""),
    ("  registerOfficeTime(stateOfficeHoursToday);\n", ""),
    ("export const OFFICE_DAY_STATE_MODULE: CoreModule = {\n  id: OFFICE_DAY_STATE_MODULE_ID,\n", "export const OFFICE_DAY_STATE_MODULE: CoreModule = {\n  id: OFFICE_DAY_STATE_MODULE_ID,\n  // The hours a state legislator's session, committee and caucus days take from their day.\n  officeTime: stateOfficeHoursToday,\n"),
])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
