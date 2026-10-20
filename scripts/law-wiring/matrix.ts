/**
 * Builds the law-wiring matrix from the checker's place runs (check.ts):
 * one row per law, each of the nine links graded wired, partial or missing
 * with its evidence (a record id or file:line) and, where it is not wired,
 * why. Writes docs/reports/law-wiring-matrix.json and prints the summary.
 *
 *   node --import tsx scripts/law-wiring/matrix.ts docs/reports/law-wiring/*.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import stopgaps from "../../src/core2/data/stopgaps.json" with { type: "json" };
import declared from "./declared.json" with { type: "json" };
import {
  allLaws,
  changeInData,
  existsInData,
  reachInData,
  webLinksOf,
  type LawEntry,
} from "./catalog";

type Status = "wired" | "partial" | "missing" | "stopgap" | "n/a";
interface Link {
  status: Status;
  evidence: string;
  why: string;
}

interface ReachCount {
  fullPeople: number;
  countedGroups: number;
  countedPeople: number;
  households: number;
  organizations: number;
  governments: number;
  other: number;
  open: number;
  ended: number;
  sample: string[];
}
interface Result {
  key: string;
  error?: string;
  inForceAtOpening: boolean;
  change: string;
  lawIds: string[];
  openingRow: string | null;
  openingReach: ReachCount;
  reach: ReachCount;
  readers: Record<string, number>;
  money: {
    direct: {
      kind: string;
      treatment: number;
      control: number;
      ids: string[];
    }[];
    diff: { kind: string; treatment: number; control: number; ids: string[] }[];
    diffKinds: number;
    cited: { token: string; gross: number; ids: string[] }[];
  };
  web: {
    links: { key: string; status: string; to: string }[];
    fired: { id: string; link: string; effect: number }[];
    firedCount: number;
  };
  heard: { people: number; sample: string[] };
  afterUndo: ReachCount;
}
interface PlaceRun {
  seed: string;
  place: { name: string; state: string; key: string };
  results: Result[];
}

/** Files that read a law to decide whether to propose, report or tell it, not to apply it. */
const NOT_AN_EFFECT = [
  "src/core2/modules/legislature",
  "src/core2/modules/world-legislating",
  "src/core2/modules/executive",
  "src/core2/modules/campaigns",
  "src/core2/modules/interest-groups",
  "src/core2/modules/ballot-measures",
  "src/core2/modules/outcome-web",
  "src/core2/modules/news",
  "src/core2/modules/press",
  "src/core2/modules/views",
  "src/core2/modules/speech",
  "src/core2/policy-authority",
  // The day loop calling the laws engine's own calendar work (a law taking effect).
  "src/core2/life.ts",
  "unknown",
  // The outcome web's government measures and constituents' complaints talk about a law; they apply nothing.
  "src/core2/gov-measures",
  "src/core2/modules/constituent-cases",
  "src/core2/past",
  "src/core2/law-reach/",
  "src/director/",
  "src/english/",
  "src/bench/",
];
/** Links a law does not have by its statute, or a stopgap for one law's link, by law key and link. */
const DECLARED = (
  declared as unknown as {
    laws: Record<
      string,
      Record<string, { status: "n/a" | "stopgap"; id?: string; why: string }>
    >;
  }
).laws;

const isEngine = (file: string) =>
  !NOT_AN_EFFECT.some((p) => file.startsWith(p));

const STOPGAP_ROWS = stopgaps as unknown as { id: string; status?: string }[];
function stopgapOf(id: string | null): { id: string; open: boolean } | null {
  const row = id ? STOPGAP_ROWS.find((r) => r.id === id) : undefined;
  return row ? { id: row.id, open: row.status !== "resolved" } : null;
}

function reachLink(law: LawEntry, runs: { place: string; r: Result }[]): Link {
  const data = reachInData(law);
  const per = runs.map(({ place, r }) => {
    const c = r.inForceAtOpening ? r.openingReach : r.reach;
    return { place, c, r };
  });
  const best = per.find((p) => p.c.open > 0);
  if (!best) {
    const why = !data.group
      ? "no law-reach row: nothing records who it applies to"
      : !data.handlers
        ? `law-reach row (group ${data.group}, mechanic ${data.mechanic}) has no handler registered: the mechanic list is empty, so no reach record is written`
        : `handler registered (group ${data.group}, mechanic ${data.mechanic}) but it recorded nobody in ${per.map((p) => p.place).join(" or ")}`;
    return {
      status: "missing",
      evidence: per.map((p) => `${p.place}: ${p.r.change}`).join("; "),
      why,
    };
  }
  const counted = per.some(
    (p) => p.c.countedGroups > 0 || p.c.countedPeople > 0,
  );
  const evidence = per
    .map(
      (p) =>
        `${p.place}: ${p.c.open} open (full ${p.c.fullPeople}, counted groups ${p.c.countedGroups}/${p.c.countedPeople} people, households ${p.c.households}, orgs ${p.c.organizations}, govts ${p.c.governments}) e.g. ${p.c.sample[0] ?? "-"}`,
    )
    .join("; ");
  const zero = per.filter((p) => p.c.open === 0).map((p) => p.place);
  if (zero.length)
    return {
      status: "partial",
      evidence,
      why: `reached nobody in ${zero.join(", ")}`,
    };
  if (!counted && per.some((p) => p.c.fullPeople > 0))
    return {
      status: "partial",
      evidence,
      why: "full people only: no counted group is reached (one model, two tiers)",
    };
  return { status: "wired", evidence, why: "" };
}

function systemsLink(
  law: LawEntry,
  runs: { place: string; r: Result }[],
): Link {
  // A budget line is read by the treasury that pays it and the engine that staffs or serves from it.
  if (law.kind === "budget-line") {
    const posters = new Set(
      runs.flatMap(({ r }) =>
        (r.money?.diff ?? []).map(
          (d) => d.kind.split(" @ ")[1]?.replace(/:\d+$/, "") ?? "",
        ),
      ),
    );
    const reached = runs.some(({ r }) => r.reach.open > 0);
    if (posters.size && reached)
      return {
        status: "wired",
        evidence: [...posters].slice(0, 5).join(", "),
        why: "",
      };
    return {
      status: posters.size || reached ? "partial" : "missing",
      evidence: [...posters].slice(0, 5).join(", "),
      why: !posters.size
        ? "no engine paid anything differently from the changed line"
        : "the line's money moved but no engine recorded whom it served",
    };
  }
  const engines = new Map<string, number>();
  const handlers = new Set<string>();
  for (const { r } of runs)
    for (const [frame, n] of Object.entries(r.readers ?? {})) {
      if (isEngine(frame)) engines.set(frame, (engines.get(frame) ?? 0) + n);
      else if (frame.startsWith("src/core2/law-reach/")) handlers.add(frame);
    }
  if (engines.size)
    return {
      status: "wired",
      evidence: [...engines.keys()].slice(0, 6).join(", "),
      why: "",
    };
  if (handlers.size)
    return {
      status: "partial",
      evidence: [...handlers].join(", "),
      why: "only law reach's own handler reads it; no engine reads the law at the moment it decides or pays",
    };
  return {
    status: "missing",
    evidence: "table trace: no engine read the law's rows in the run",
    why: "no engine reads it (only lawmaking, news or the outcome web, if anything)",
  };
}

function moneyLink(law: LawEntry, runs: { place: string; r: Result }[]): Link {
  const direct = runs.flatMap(({ place, r }) =>
    (r.money?.direct ?? []).map((d) => ({ place, d })),
  );
  const cited = runs.flatMap(({ place, r }) =>
    (r.money?.cited ?? [])
      .filter((c) => c.gross > 0)
      .map((c) => ({ place, c })),
  );
  if (direct.length || cited.length) {
    const ev = [
      ...direct
        .slice(0, 3)
        .map(
          ({ place, d }) =>
            `${place}: ${d.kind} ${d.control} -> ${d.treatment} (${d.ids[0] ?? ""})`,
        ),
      ...cited
        .slice(0, 2)
        .map(
          ({ place, c }) =>
            `${place}: posts citing ${c.token}: ${c.gross} (${c.ids[0]})`,
        ),
    ].join("; ");
    return { status: "wired", evidence: ev, why: "" };
  }
  const any = runs.flatMap(({ place, r }) =>
    (r.money?.diff ?? []).map((d) => ({ place, d })),
  );
  // The control enacted a null law the same day, so a post that differs is this law's.
  if (any.length)
    return {
      status: "wired",
      evidence: any
        .slice(0, 3)
        .map(
          ({ place, d }) =>
            `${place}: ${d.kind} ${d.control} -> ${d.treatment} (${d.ids[0] ?? ""})`,
        )
        .join("; "),
      why: "",
    };
  return {
    status: "missing",
    evidence: "journal trace: no post differs from the control world",
    why:
      law.kind === "budget-line"
        ? "the budget change moved no money in the window"
        : "no money flow: nobody pays or receives anything because of it",
  };
}

function webLink(law: LawEntry, runs: { place: string; r: Result }[]): Link {
  const links = webLinksOf(law);
  if (!links.length)
    return {
      status: "missing",
      evidence: "data/research/outcome-web/links.json",
      why: "no researched outcome-web link starts from this law",
    };
  const fired = runs.flatMap(({ place, r }) =>
    (r.web?.fired ?? []).map((f) => ({ place, f })),
  );
  const built = links.filter((l) => l.status === "built");
  const notBuilt = links.filter((l) => l.status !== "built");
  if (fired.length) {
    const ev = fired
      .slice(0, 3)
      .map(
        ({ place, f }) => `${place}: ${f.id} ${f.link} ${f.effect.toFixed(4)}`,
      )
      .join("; ");
    return notBuilt.length
      ? {
          status: "partial",
          evidence: ev,
          why: `links not built: ${notBuilt.map((l) => `${l.key} (${l.status})`).join(", ")}`,
        }
      : { status: "wired", evidence: ev, why: "" };
  }
  if (!built.length)
    return {
      status: "missing",
      evidence: links.map((l) => `${l.key}: ${l.status}`).join(", "),
      why: `every link is unbuilt: ${[...new Set(links.map((l) => l.status))].join(", ")}`,
    };
  return {
    status: "missing",
    evidence: built.map((l) => l.key).join(", "),
    why: "built links did not move their measure in the run (cause not read by the web, or the measure is not kept for this place)",
  };
}

function knowingLink(runs: { place: string; r: Result }[]): Link {
  const heard = runs.filter(({ r }) => (r.heard?.people ?? 0) > 0);
  if (heard.length)
    return {
      status: "wired",
      evidence: heard
        .map(
          ({ place, r }) =>
            `${place}: ${r.heard.people} people heard (${r.heard.sample[0] ?? ""})`,
        )
        .join("; "),
      why: "",
    };
  return {
    status: "missing",
    evidence: "news heard table",
    why: "nobody heard of it: the change is not a news story anyone receives",
  };
}

function repealLink(runs: { place: string; r: Result }[]): Link {
  const notes: string[] = [];
  let ok = 0;
  let had = 0;
  for (const { place, r } of runs) {
    if (r.inForceAtOpening) {
      if (r.openingReach.open === 0) continue;
      had += 1;
      // The repeal window's reach (lawIds null) should hold no open row, and re-enacting reopens it.
      if (r.reach.open === 0 && r.afterUndo.open > 0) ok += 1;
      notes.push(
        `${place}: opening ${r.openingReach.open} -> after repeal ${r.reach.open} -> re-enacted ${r.afterUndo.open}`,
      );
    } else {
      if (r.reach.open === 0) continue;
      had += 1;
      if (r.afterUndo.open === 0) ok += 1;
      notes.push(
        `${place}: ${r.reach.open} open -> after repeal ${r.afterUndo.open} open, ${r.afterUndo.ended} ended`,
      );
    }
  }
  if (!had)
    return {
      status: "missing",
      evidence: "",
      why: "nothing reached, so nothing to stop",
    };
  if (ok === had)
    return { status: "wired", evidence: notes.join("; "), why: "" };
  return {
    status: "missing",
    evidence: notes.join("; "),
    why: "repeal leaves reach rows open (or re-enacting does not reopen them)",
  };
}

const MARK: Record<Status, string> = {
  wired: "yes",
  partial: "part",
  missing: "NO",
  stopgap: "SG",
  "n/a": "n/a",
};
const LINKS = [
  "exists",
  "change",
  "reach",
  "systems",
  "money",
  "web",
  "knowing",
  "repeal",
  "allPlaces",
];

/** The matrix as a Markdown table, then each link that is not wired with its reason. */
function table(
  rows: {
    key: string;
    name: string;
    family: string;
    overall: string;
    links: Record<string, Link>;
  }[],
): string {
  const lines = [
    "| Law | Family | " + LINKS.join(" | ") + " | Overall |",
    "| --- | --- | " + LINKS.map(() => "---").join(" | ") + " | --- |",
  ];
  for (const r of rows)
    lines.push(
      `| ${r.name} | ${r.family} | ${LINKS.map((k) => MARK[r.links[k]!.status]).join(" | ")} | ${r.overall} |`,
    );
  lines.push("", "## Why each link is missing", "");
  for (const r of rows) {
    const gaps = LINKS.filter((k) => r.links[k]!.status !== "wired");
    if (!gaps.length) continue;
    lines.push(`**${r.name}** (\`${r.key}\`)`, "");
    for (const k of gaps)
      lines.push(`- ${k}: ${r.links[k]!.why || r.links[k]!.status}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main(): void {
  const files = process.argv.slice(2);
  const runs: PlaceRun[] = files.map(
    (f) => JSON.parse(readFileSync(f, "utf8")) as PlaceRun,
  );
  const byKey = new Map<string, { place: string; r: Result }[]>();
  for (const run of runs)
    for (const r of run.results) {
      const list = byKey.get(r.key) ?? [];
      list.push({
        place: `${run.place.name}, ${run.place.state} (seed ${run.seed.slice(0, 16)})`,
        r,
      });
      byKey.set(r.key, list);
    }
  const rows = allLaws().map((law) => {
    const rs = (byKey.get(law.key) ?? []).filter(({ r }) => !r.error);
    const errors = (byKey.get(law.key) ?? [])
      .filter(({ r }) => r.error)
      .map(({ place, r }) => `${place}: ${r.error!.split("\n")[0]}`);
    const ex = existsInData(law);
    const ch = changeInData(law);
    const data = reachInData(law);
    const links: Record<string, Link> = {
      exists: {
        status:
          ex.places === 56 ? "wired" : ex.places > 0 ? "partial" : "missing",
        evidence: `${ex.places}/56 places (${
          Object.entries(ex.levels)
            .map(([l, n]) => `${l} ${n}`)
            .join(", ") || "budgets"
        }); ${ex.evidence}${rs[0]?.r.openingRow ? `; drawn place row ${rs[0].r.openingRow}` : ""}`,
        why:
          ex.places === 56
            ? ""
            : `no starting row in ${ex.missing.slice(0, 12).join(", ")}${ex.missing.length > 12 ? "..." : ""}`,
      },
      change: {
        status: ch.ok ? "wired" : "missing",
        evidence: ch.evidence,
        why: ch.why,
      },
    };
    if (!rs.length) {
      for (const k of [
        "reach",
        "systems",
        "money",
        "web",
        "knowing",
        "repeal",
        "allPlaces",
      ])
        links[k] = {
          status: "missing",
          evidence: errors.join("; "),
          why: errors.length
            ? "the checker could not change it in a played world"
            : "not run",
        };
    } else {
      links.reach = reachLink(law, rs);
      links.systems = systemsLink(law, rs);
      links.money = moneyLink(law, rs);
      links.web = webLink(law, rs);
      links.knowing = knowingLink(rs);
      links.repeal = repealLink(rs);
      const sameEverywhere =
        rs.every(
          ({ r }) =>
            (r.inForceAtOpening ? r.openingReach.open : r.reach.open) > 0,
        ) ||
        rs.every(
          ({ r }) =>
            (r.inForceAtOpening ? r.openingReach.open : r.reach.open) === 0,
        );
      links.allPlaces = {
        status:
          sameEverywhere && links.reach.status !== "missing"
            ? "wired"
            : links.reach.status === "missing"
              ? "missing"
              : "partial",
        evidence: rs.map(({ place }) => place).join("; "),
        why: sameEverywhere
          ? links.reach.status === "missing"
            ? "reaches nobody anywhere"
            : ""
          : "reached people in one drawn place and not the other",
      };
    }
    // A link the statute itself does not have (declared.json: a law that moves
    // no money, a rule with no researched outcome), or a stopgap registered
    // for exactly this law and link, explains a link that is not wired.
    for (const [k, d] of Object.entries(DECLARED[law.key] ?? {}))
      if (links[k] && links[k]!.status !== "wired") {
        const sgRow = d.id ? stopgapOf(d.id) : null;
        if (d.status === "stopgap" && !sgRow?.open) continue;
        links[k] = {
          ...links[k]!,
          status: d.status,
          why: d.id ? `${d.why} (${d.id})` : d.why,
        };
      }
    // A policy's registered stopgap explains a missing effect (reach, the
    // engines, money, the outcome web); it is not wiring.
    const sg = stopgapOf(data.stopgapId);
    if (sg?.open)
      for (const k of ["reach", "systems", "money", "web"])
        if (links[k]!.status === "missing")
          links[k] = {
            ...links[k]!,
            status: "stopgap",
            why: `${links[k]!.why} (registered ${sg.id})`,
          };
    const statuses = Object.values(links).map((l) => l.status);
    const overall = statuses.every((s) => s === "wired" || s === "n/a")
      ? "wired"
      : statuses.every(
            (s) => s === "wired" || s === "n/a" || s === "stopgap",
          ) && statuses.includes("stopgap")
        ? "stopgapped"
        : "partly";
    return {
      key: law.key,
      name: law.name,
      kind: law.kind,
      family: law.family,
      reachGroup: data.group,
      mechanic: data.mechanic,
      overall,
      links,
      runs: rs.map(({ place, r }) => ({
        place,
        change: r.change,
        inForceAtOpening: r.inForceAtOpening,
      })),
      errors,
    };
  });
  const out = {
    about:
      "One row per law: each of the nine wiring links (exists, change, reach, systems, money, web, knowing, repeal, allPlaces) graded wired, partial, missing or stopgap, with evidence and why. Built by scripts/law-wiring/matrix.ts from scripts/law-wiring/check.ts runs.",
    places: runs.map((r) => ({ seed: r.seed, ...r.place })),
    summary: {
      laws: rows.length,
      wired: rows.filter((r) => r.overall === "wired").length,
      partly: rows.filter((r) => r.overall === "partly").length,
      stopgapped: rows.filter((r) => r.overall === "stopgapped").length,
      byLink: Object.fromEntries(
        [
          "exists",
          "change",
          "reach",
          "systems",
          "money",
          "web",
          "knowing",
          "repeal",
          "allPlaces",
        ].map((k) => [
          k,
          Object.fromEntries(
            ["wired", "partial", "missing", "stopgap", "n/a"].map((s) => [
              s,
              rows.filter((r) => r.links[k]?.status === s).length,
            ]),
          ),
        ]),
      ),
    },
    rows,
  };
  writeFileSync(
    "docs/reports/law-wiring-matrix.json",
    `${JSON.stringify(out, null, 1)}\n`,
  );
  writeFileSync("docs/reports/law-wiring-table.md", table(rows));
  console.log(JSON.stringify(out.summary, null, 1));
}

main();
