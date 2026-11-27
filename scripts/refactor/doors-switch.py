#!/usr/bin/env python3
"""Switches direct opens of another engine's tables to that engine's door.

Doors (Nov 27): code that opens another engine's module table
(`api.moduleState(X).table(T).get/rows/query(...)`) asks the owner's door
instead, so there is one way to read each record. Each rule is keyed on the
module, the table and the method, never on a line number, and the door it
names returns the same rows the open returned (the door files hold the same
table, method and key).

Usage: python3 scripts/refactor/doors-switch.py [--new-imports] <file> ...
Prints, per file, `applied N`, `already` (the file opens none of the shapes
below), `HELD` for a switch that would add a run-time import the file does not
have yet, or `MISSED` for a chain it recognized but could not place, and
exits 1 on a miss. Run it again and every file reads `already` or `HELD`.

A new run-time import from a file inside the source ring adds an edge on a
cycle (tests/guards/import-cycles.test.ts), so by default a switch applies only
where the file already imports the door's file at run time, or where the door
file imports nothing at run time. `--new-imports`
allows new imports, for files outside the ring; check the cycle counts after.

Opens held in a variable (`const offices = api.moduleState(X)`) and the
shapes no door covers are left for the hand switch and listed in the pull
request.
"""
from __future__ import annotations

import os
import re
import sys

# module id spellings -> family key
MODULES = {
    "OFFICES_MODULE_ID": "offices",
    '"core2-offices-v1"': "offices",
    "ELECTIONS_MODULE_ID": "elections",
    '"core2-elections-v1"': "elections",
    "BUDGETS_MODULE_ID": "budgets",
    '"core2-budgets-v1"': "budgets",
    "LAWS_MODULE_ID": "laws",
    '"core2-laws-v1"': "laws",
    "LEGISLATURE_MODULE_ID": "legislature",
    '"core2-legislature-v1"': "legislature",
    "MEETINGS_MODULE_ID": "meetings",
    '"core2-meetings-v1"': "meetings",
    "LEADERSHIP_MODULE_ID": "leadership",
    '"core2-leadership-v1"': "leadership",
    "JUSTICE_MODULE_ID": "justice",
    '"core2-justice-v1"': "justice",
    "CRIME_MODULE_ID": "crime",
    '"core2-crime-v1"': "crime",
    "CORRUPTION_MODULE_ID": "corruption",
    '"corruption"': "corruption",
    "JOBS_MODULE_ID": "jobs",
    '"jobs"': "jobs",
    "MACRO_MODULE_ID": "macro",
    '"macro"': "macro",
    "PRESS_MODULE_ID": "press",
    '"core2-press-v1"': "press",
}

# (family, table, method, argument count or None for any) -> (door, door file)
RULES = {
    ("offices", "offices", "get", 1): ("officeById", "modules/offices"),
    ("offices", "offices", "rows", 0): ("allOffices", "modules/offices"),
    ("offices", "offices", "query:byJurisdiction", 1): ("officesInJurisdiction", "modules/offices"),
    ("offices", "seats", "get", 1): ("seatById", "modules/offices"),
    ("offices", "seats", "rows", 0): ("allSeats", "modules/offices"),
    ("offices", "seats", "query:byOffice", 1): ("officeSeats", "modules/offices"),
    ("offices", "terms", "get", 1): ("termById", "modules/offices"),
    ("offices", "terms", "rows", 0): ("allTerms", "modules/offices"),
    ("offices", "terms", "query:byPerson", 1): ("termsOfPerson", "modules/offices"),
    ("offices", "terms", "query:bySeatStatus:serving", 1): ("servingTermsOnSeat", "modules/offices"),
    ("offices", "terms", "query:byOfficeStatus:serving", 1): ("servingTermsOfOffice", "modules/offices"),
    ("offices", "terms", "query:byStatus:serving", 0): ("servingTerms", "modules/offices"),
    ("offices", "vacancies", "get", 1): ("vacancyById", "modules/offices"),
    ("elections", "contests", "get", 1): ("contestOf", "modules/elections"),
    ("elections", "filings", "get", 1): ("filingOf", "modules/elections"),
    ("elections", "filings", "query:byPerson", 1): ("filingsOfPerson", "modules/elections"),
    ("elections", "filings", "query:byContest", 1): ("filingsInContest", "modules/elections"),
    ("budgets", "budgets", "get", 1): ("budgetRowOf", "budgets-reads"),
    ("budgets", "budgets", "rows", 0): ("allBudgetRows", "budgets-reads"),
    ("budgets", "governments", "get", 1): ("governmentRowOf", "budgets-reads"),
    ("laws", "laws", "get", 1): ("lawRowById", "modules/laws-reads"),
    ("laws", "laws", "rows", 0): ("allLawRows", "modules/laws-reads"),
    ("legislature", "bills", "get", 1): ("billById", "modules/bodies-reads"),
    ("legislature", "bills", "rows", 0): ("allBills", "modules/bodies-reads"),
    ("legislature", "studies", "get", 1): ("studyById", "modules/bodies-reads"),
    ("meetings", "townHalls", "get", 1): ("townHallById", "modules/bodies-reads"),
    ("meetings", "debates", "get", 1): ("debateById", "modules/bodies-reads"),
    ("meetings", "remarks", "get", 1): ("remarkById", "modules/bodies-reads"),
    ("leadership", "posts", "rows", 0): ("allLeadershipPosts", "modules/bodies-reads"),
    ("justice", "cases", "get", 1): ("justiceCaseById", "modules/justice-reads"),
    ("justice", "sentences", "get", 1): ("sentenceById", "modules/justice-reads"),
    ("justice", "custody", "get", 1): ("custodyById", "modules/justice-reads"),
    ("corruption", "crimes", "get", 1): ("corruptionCrimeById", "modules/justice-reads"),
    ("crime", "months", "get", 1): ("crimeMonthById", "modules/justice-reads"),
    ("crime", "months", "query:byPlace", 1): ("crimeMonthsOfPlace", "modules/justice-reads"),
    ("jobs", "seekers", "get", 1): ("seekerOf", "jobs-reads"),
    ("jobs", "changes", "get", 1): ("jobChange", "jobs-reads"),
    ("jobs", "changes", "query:byPerson", 1): ("jobChangesOf", "jobs-reads"),
    ("macro", "months", "rows", 0): ("allMacroMonths", "macro-reads"),
    ("press", "interviews", "get", 1): ("interviewOf", "modules/press"),
}

ONLY = set(filter(None, os.environ.get("DOORS_ONLY", "").split(",")))
NEW_IMPORTS = "--new-imports" in sys.argv


def door_spec(path: str, door_file: str) -> str:
    rel = os.path.relpath(os.path.join("src/core2", door_file), os.path.dirname(path))
    return rel if rel.startswith(".") else "./" + rel


def is_leaf(door_file: str) -> bool:
    """A door file that imports nothing at run time adds no edge to any ring."""
    try:
        with open(os.path.join("src/core2", door_file + ".ts"), encoding="utf8") as f:
            text = f.read()
    except FileNotFoundError:
        return False
    return not re.search(r"^import\s+(?!type\b)", text, re.M)


def imports_at_run_time(text: str, spec: str) -> bool:
    for found in re.finditer(r"import\s+(type\s+)?\{([^}]*)\}\s*from\s*\"" + re.escape(spec) + r"\";", text, re.S):
        if found.group(1):
            continue
        if any(not n.strip().startswith("type ") for n in found.group(2).split(",") if n.strip()):
            return True
    return False


def balanced(text: str, start: int) -> int:
    """Index just past the bracket closing the one at `start`."""
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack = [pairs[text[start]]]
    i = start + 1
    quote = None
    while i < len(text):
        c = text[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c in pairs:
            stack.append(pairs[c])
        elif c in ")]}":
            if c != stack.pop():
                raise ValueError("unbalanced")
            if not stack:
                return i + 1
        i += 1
    raise ValueError("unterminated")


def split_args(inner: str) -> list[str]:
    args, depth, cur, quote = [], 0, "", None
    i = 0
    while i < len(inner):
        c = inner[i]
        if quote:
            cur += c
            if c == "\\":
                cur += inner[i + 1]
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
            cur += c
        elif c in "([{":
            depth += 1
            cur += c
        elif c in ")]}":
            depth -= 1
            cur += c
        elif c == "," and depth == 0:
            args.append(cur.strip())
            cur = ""
        else:
            cur += c
        i += 1
    if cur.strip():
        args.append(cur.strip())
    return args


def receiver_start(text: str, dot: int) -> int | None:
    """Start of the expression the `.moduleState` call hangs off."""
    i = dot - 1
    while i >= 0 and text[i].isspace():
        i -= 1
    if text[i] == ")":
        depth = 0
        while i >= 0:
            if text[i] == ")":
                depth += 1
            elif text[i] == "(":
                depth -= 1
                if depth == 0:
                    break
            i -= 1
        i -= 1
    end = i
    while i >= 0 and (text[i].isalnum() or text[i] in "_$"):
        i -= 1
    if i == end:
        return None
    # A member chain such as `this.api` or `ctx.api` is part of the receiver.
    while i >= 0 and text[i] == "." and i > 0 and (text[i - 1].isalnum() or text[i - 1] in "_$"):
        i -= 1
        while i >= 0 and (text[i].isalnum() or text[i] in "_$"):
            i -= 1
    return i + 1


CHAIN = re.compile(r"\.\s*moduleState\(")
STEP = re.compile(r"\s*\.\s*(table|get|rows|query)\(")


def local_modules(text: str) -> dict[str, str]:
    """A file's own constants for module ids (`const OFFICES = "core2-offices-v1"`)."""
    found = {}
    for name, value in re.findall(r'^const (\w+) = ("[\w-]+");', text, re.M):
        if value in MODULES:
            found[name] = MODULES[value]
    return found


def rewrite(path: str, text: str) -> tuple[str, int, list[str], dict[str, str], list[str]]:
    out, applied, missed, imports, held = text, 0, [], {}, []
    modules = {**MODULES, **local_modules(text)}
    pos = 0
    while True:
        m = CHAIN.search(out, pos)
        if not m:
            break
        paren = m.end() - 1
        try:
            close = balanced(out, paren)
        except ValueError:
            pos = m.end()
            continue
        module = modules.get(out[paren + 1 : close - 1].strip())
        step = STEP.match(out, close)
        if not module or not step or step.group(1) != "table":
            pos = m.end()
            continue
        t_close = balanced(out, step.end() - 1)
        table_arg = out[step.end() : t_close - 1].strip()
        method = STEP.match(out, t_close)
        if not method or method.group(1) == "table" or not re.fullmatch(r'"\w+"', table_arg):
            pos = m.end()  # a table held in a variable: switched by hand
            continue
        m_close = balanced(out, method.end() - 1)
        args = split_args(out[method.end() : m_close - 1])
        kind = method.group(1)
        key_args = args
        if kind == "query":
            index = args[0].strip('"') if args else ""
            kind = f"query:{index}"
            params = args[1] if len(args) > 1 else "[]"
            inner = split_args(params.strip()[1:-1]) if params.strip().startswith("[") else None
            if inner is None:
                missed.append(out[m.start() : m_close].replace("\n", " ")[:120])
                pos = m_close
                continue
            if len(args) > 2:
                missed.append(out[m.start() : m_close].replace("\n", " ")[:120])
                pos = m_close
                continue
            if inner and inner[-1] == '"serving"':
                kind += ":serving"
                inner = inner[:-1]
            key_args = inner
        rule = RULES.get((module, table_arg.strip('"'), kind, len(key_args)))
        if not rule or (ONLY and rule[0] not in ONLY):
            pos = m_close
            continue
        start = receiver_start(out, m.start())
        if start is None:
            missed.append(out[m.start() : m_close].replace("\n", " ")[:120])
            pos = m_close
            continue
        receiver = re.sub(r"\s+", " ", out[start : m.start()].strip())
        door, door_file = rule
        if re.search(r"\b(function|const|let|var|class)\s+" + door + r"\b", text):
            missed.append(f"{door}: the file declares its own {door}; switch by hand with an alias")
            pos = m_close
            continue
        if (
            not NEW_IMPORTS
            and not is_leaf(door_file)
            and not imports_at_run_time(text, door_spec(path, door_file))
        ):
            held.append(f"{door} ({door_file})")
            pos = m_close
            continue
        call = f"{door}({', '.join([receiver, *key_args])})"
        out = out[:start] + call + out[m_close:]
        imports[door] = door_file
        applied += 1
        pos = start + len(call)
    return out, applied, missed, imports, held


def add_imports(text: str, path: str, imports: dict[str, str]) -> str:
    by_file: dict[str, list[str]] = {}
    for door, door_file in imports.items():
        by_file.setdefault(door_spec(path, door_file), []).append(door)
    for rel, doors in by_file.items():
        pattern = re.compile(
            r"import\s*\{([^}]*)\}\s*from\s*\"" + re.escape(rel) + r"\";", re.S
        )
        found = pattern.search(text)
        if found and not found.group(0).startswith("import type"):
            names = [n.strip() for n in found.group(1).split(",") if n.strip()]
            for door in doors:
                if door not in names:
                    names.append(door)
            text = text[: found.start()] + "import { " + ", ".join(names) + f' }} from "{rel}";' + text[found.end() :]
        else:
            last = list(re.finditer(r"^import[^;]*;\n", text, re.M | re.S))
            at = last[-1].end() if last else 0
            line = "import { " + ", ".join(sorted(doors)) + f' }} from "{rel}";\n'
            text = text[:at] + line + text[at:]
    return text


def main() -> int:
    missed_any = False
    for path in [a for a in sys.argv[1:] if not a.startswith("--")]:
        with open(path, encoding="utf8") as f:
            text = f.read()
        new, applied, missed, imports, held = rewrite(path, text)
        if imports:
            new = add_imports(new, path, imports)
        if new != text:
            with open(path, "w", encoding="utf8") as f:
                f.write(new)
        for chain in missed:
            print(f"{path}: MISSED {chain}")
            missed_any = True
        for door in held:
            print(f"{path}: HELD {door}: a new run-time import")
        print(f"{path}: {'applied ' + str(applied) if applied else 'already'}")
    return 1 if missed_any else 0


if __name__ == "__main__":
    sys.exit(main())
