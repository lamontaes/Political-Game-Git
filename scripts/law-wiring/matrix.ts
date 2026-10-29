/**
 * Builds the law-wiring matrix from the checker's place runs (check.ts):
 * one row per law, each of the nine links graded wired, partial or missing
 * with its evidence (a record id or file:line) and, where it is not wired,
 * why. Writes docs/reports/law-wiring-matrix.json and prints the summary.
 *
 *   node --import tsx scripts/law-wiring/matrix.ts docs/reports/law-wiring/*.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import stopgaps from "../../src/core2/data/stopgaps.json" with { type: "json" };
import researchGaps from "../../src/core2/data/laws/outcome-research-gaps.json" with { type: "json" };
import unwiredLinks from "../../src/core2/data/outcome-web/unwired.json" with { type: "json" };
import effectMatrix from "../../docs/reports/effect-web-matrix-2026-10-20.json" with { type: "json" };
import { ownLeast, pickOwn, type OwnPair } from "./own-payments";
import { splitByReader } from "./unread-links";
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
  /** Money graded only by posts that differ from the control world, with no post citing the law or a direct flow: a statute-based not-applicable declaration overrides it. */
  untraced?: boolean;
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
  kind: string;
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
    cited: { token: string; gross: number; ids: string[]; control?: number }[];
    /** Posts citing a law in force at the opening in the control world, where it stays in force (older result files have none). */
    controlCited?: { token: string; gross: number; ids: string[] }[];
    /**
     * For an act that moves budget lines: each line its own move rows name,
     * the amount moved, and what the treasury paid on it here and in the
     * control world (empty: the act moved nothing; absent: not such an act).
     */
    lines?: {
      government: string;
      line: string;
      moved: number;
      treatment: number;
      control: number;
      /** Payments before this day only: a body in play changed the act on it. */
      before?: string;
      ids: string[];
    }[];
    /** The law's own payments to whom it reached, against the control world (older result files have none). */
    own?: {
      /** Whom the payment was looked for among: those the law's records say it paid or charged, else everyone it reached (older result files: reached). */
      targets: number;
      among?: "paid" | "reached";
      paid: number;
      /** Each kind and direction of payment the targets got (newer result files). */
      pairs?: OwnPair[];
      sample: {
        target: string;
        row: string;
        date: string;
        kind: string;
        way?: "in" | "out";
        treatment: number;
        control: number;
        journal: string;
      }[];
    };
  };
  web: {
    links: { key: string; status: string; to: string }[];
    fired: { id: string; link: string; effect: number }[];
    firedCount: number;
    /** The run's window in days, and the law causes the web read differently from the control world (older result files have neither). */
    windowDays?: number;
    cause?: {
      id: string;
      month: string;
      link: string;
      from: string;
      lagMonths: number;
      treated: number;
      control: number;
    }[];
    /** The first law row a body (not the checker) enacted on the law's key in the window, which can put a changed cause back. */
    reenacted?: { id: string; effectiveDate: string; value: number } | null;
  };
  heard: { people: number; sample: string[] };
  /** Who the law could bind in the drawn place, for a law whose handler binds one kind of subject (older result files have none). */
  subjects?: { count: number; why: string; ids: string[] };
  /** The law's own applied rows in the window and how many record an amount (older result files have none). */
  applied?: { rows: number; withAmount: number; sample: string[] };
  afterUndo: ReachCount;
  /** Reach still citing the changed row once the old amount is put back (older result files have none). */
  afterUndoChanged?: ReachCount;
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
/** Laws with no researched outcome link, each with its registered stopgap. */
/**
 * Who reads each outcome-web link's factor, by file and line, from the effect
 * matrix (scripts/outcome-web/effect-matrix.ts): a web link counts as wired
 * only where its row names the reader beside the month's record id
 * (OWNER-DECISIONS, Oct 28 05:30).
 */
/**
 * The research links counted once, here beside the laws (the effect matrix
 * is the one grader of links): how many reach people or are carried by an
 * engine, how many the research finds about zero, and how many are unread,
 * each named in a stopgap.
 */
const LINK_COUNTS = (() => {
  const summary = (
    effectMatrix as unknown as {
      summary: {
        links: number;
        reachesTheWorld: number;
        aboutZero?: number;
        namedInAStopgap: number;
        notReachingAndNoStopgap: number;
      };
    }
  ).summary;
  const aboutZero = summary.aboutZero ?? 0;
  return {
    links: summary.links,
    reaching: summary.reachesTheWorld,
    aboutZero,
    unread: summary.links - summary.reachesTheWorld - aboutZero,
    unreadWithNoStopgap: summary.notReachingAndNoStopgap,
  };
})();

const WEB_READERS = new Map(
  (
    effectMatrix as unknown as {
      links: {
        key: string;
        points: { reaches?: { status: string; evidence?: string } };
      }[];
    }
  ).links
    .filter((l) => l.points.reaches?.status === "pass")
    .map((l) => [l.key, l.points.reaches!.evidence ?? ""]),
);

const RESEARCH_GAPS = new Map(
  (
    researchGaps as {
      laws: { key: string; outcome: string; stopgapId: string }[];
    }
  ).laws.map((row) => [row.key, row]),
);

type Declared = Record<
  string,
  Record<string, { status: "n/a" | "stopgap"; id?: string; why: string }>
>;
/**
 * Links a law does not have by its statute, or a stopgap for one law's link,
 * by law key and link: declared.json, then one file per family in declared/
 * (so family PRs do not edit one shared file).
 */
const DECLARED: Declared = (() => {
  const dir = "scripts/law-wiring/declared";
  const files = [
    "scripts/law-wiring/declared.json",
    ...(existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".json"))
          .sort()
          .map((f) => `${dir}/${f}`)
      : []),
  ];
  const out: Declared = {};
  for (const file of files) {
    const { laws } = JSON.parse(readFileSync(file, "utf8")) as {
      laws: Declared;
    };
    for (const [key, links] of Object.entries(laws))
      out[key] = { ...out[key], ...links };
  }
  return out;
})();

/**
 * Laws whose subject is the work of an engine the grader otherwise counts as
 * lawmaking or politics: that engine applying the law is the law's effect.
 * An authority law (and home rule) is the legislature's check when a body
 * drafts under it; a ban on lobbying after office is the interest groups'
 * choice of whom they may hire as their lobbyist.
 */
const APPLIED_IN: Readonly<Record<string, readonly string[]>> = {
  "local-minimum-wage-authority": ["src/core2/modules/legislature"],
  "us-policy-positions:labor-workforce.local-minimum-wage-authority": [
    "src/core2/modules/legislature",
  ],
  "local-income-tax-authority": ["src/core2/modules/legislature"],
  "us-policy-positions:government-operations.broaden-local-authority": [
    "src/core2/modules/legislature",
    "src/core2/policy-authority",
  ],
  "us-policy-positions:government-operations.ban-lobbying-after-office": [
    "src/core2/modules/interest-groups",
  ],
};
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
  // A place where the law has nobody to bind (no county out of attainment,
  // no farm, no eviction filed) reaching nobody is the statute's own terms.
  const none = per.filter((p) => p.c.open === 0 && p.r.subjects?.count === 0);
  const zero = per
    .filter((p) => p.c.open === 0 && p.r.subjects?.count !== 0)
    .map((p) => p.place);
  const evidenceAll = [
    evidence,
    ...none.map((p) => `${p.place}: nobody to bind (${p.r.subjects!.why})`),
  ].join("; ");
  if (zero.length)
    return {
      status: "partial",
      evidence: evidenceAll,
      why: `reached nobody in ${zero.join(", ")}`,
    };
  if (!counted && per.some((p) => p.c.fullPeople > 0))
    return {
      status: "partial",
      evidence: evidenceAll,
      why: "full people only: no counted group is reached (one model, two tiers)",
    };
  return { status: "wired", evidence: evidenceAll, why: "" };
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
  const applying = APPLIED_IN[law.key] ?? [];
  for (const { r } of runs)
    for (const [frame, n] of Object.entries(r.readers ?? {})) {
      // A law-reach read names the engine that called it ("reach <- caller").
      const caller = frame.split(" <- ")[1];
      if (
        isEngine(frame) ||
        (caller && caller !== "none" && isEngine(caller)) ||
        applying.some(
          (p) => frame.startsWith(p) || (caller ?? "").startsWith(p),
        )
      )
        engines.set(frame, (engines.get(frame) ?? 0) + n);
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

const fileOf = (frame: string) => frame.split(" <- ")[0]!.replace(/:\d+$/, "");
/**
 * A post is the law's own only where the file that posted it read the law in
 * that run. Older result files also counted any law-reach file (law reach
 * holds every law's handlers) and the day loop (which calls every module's
 * day), so both are checked here too.
 */
function ownPost(kind: string, r: Result): boolean {
  const file = fileOf(kind.split(" @ ")[1] ?? "");
  if (file === "src/core2/life.ts") return false;
  return Object.keys(r.readers ?? {}).some((f) => fileOf(f) === file);
}

function moneyLink(law: LawEntry, runs: { place: string; r: Result }[]): Link {
  // An act that moves budget lines is paid by the treasury on those lines:
  // its money is the lines its own move rows name, what the treasury paid on
  // them with the act and without it. An act that moved no line (a budget
  // already in balance) moved no money, whatever else differed between worlds.
  // A budget-line law is the same with its own line (the raise the checker
  // made): the treasury pays the line's workers and contractors through the
  // town's outside market, so its money is the payments the line's payment ids
  // name, here and in the control world, and it counts where the treasury paid
  // more on the line with the raise (a difference the other way is drift). Where
  // it did not, the law's other payments below are looked at.
  const line = law.kind === "budget-line";
  const what = line ? "raise" : "act";
  const moved = runs.filter(({ r }) => r.money?.lines);
  if (moved.length) {
    const paid = moved.flatMap(({ place, r }) =>
      r.money
        .lines!.filter(
          (l) =>
            l.treatment !== l.control &&
            (!line ||
              Math.sign(l.treatment - l.control) === Math.sign(l.moved)),
        )
        .map((l) => ({ place, l, opening: r.inForceAtOpening })),
    );
    if (paid.length)
      return {
        status: "wired",
        evidence: paid
          .slice(0, 3)
          .map(
            ({ place, l, opening }) =>
              `${place}: the ${l.government} treasury's payments on ${l.line}, which the ${what} moved by ${l.moved}: ${
                opening
                  ? `${l.control} with the act in force, ${l.treatment} with it repealed`
                  : `${l.control} without the ${what}, ${l.treatment} with it`
              }${l.before ? `, payments before ${l.before}` : ""} (${l.ids[0] ?? ""})`,
          )
          .join("; "),
        why: "",
      };
    const none = moved.every(({ r }) => !r.money.lines!.length);
    if (!line)
      return {
        status: "missing",
        evidence: moved
          .map(
            ({ place, r }) =>
              `${place}: ${
                r.money.lines!.length
                  ? `the act moved ${r.money.lines!.map((l) => l.line).join(", ")} and the treasury paid the same with and without it`
                  : "the act's move rows hold no line"
              }`,
          )
          .join("; "),
        why: none
          ? "the act moved no budget line in the drawn places (the budget it balances had nothing to cut), so it moved no money"
          : "the treasury paid the same on the lines the act moved with and without it",
      };
  }
  const direct = runs.flatMap(({ place, r }) =>
    (r.money?.direct ?? [])
      .filter((d) => ownPost(d.kind, r))
      .map((d) => ({ place, d })),
  );
  // A law's own payments come first: posts naming a row of the law (the one
  // the checker wrote), then those naming its key; the shared tag of the
  // checker's rows comes last because it repeats the first.
  const rank = (token: string) =>
    token.startsWith("law:") ? 0 : token.startsWith("law-wiring-") ? 2 : 1;
  const cited = runs.flatMap(({ place, r }) => {
    const named = (r.money?.cited ?? [])
      .filter((c) => c.gross > 0)
      .sort((a, b) => rank(a.token) - rank(b.token) || b.gross - a.gross);
    // The key alone is a looser match (any post that mentions it): it stands
    // only where no post names a row of the law.
    if (!named.length) return [];
    return named
      .filter((c) => rank(c.token) === rank(named[0]!.token))
      .slice(0, 2)
      .map((c) => ({ place, c }));
  });
  const controlCited = runs.flatMap(({ place, r }) =>
    (r.money?.controlCited ?? [])
      .filter((c) => c.gross > 0)
      .slice(0, 2)
      .map((c) => ({ place, c })),
  );
  // The law's own payment, picked by the same rule the checker uses from
  // every kind its targets got (older result files carry only the pick).
  const own = runs.flatMap(({ place, r }) => {
    const o = r.money?.own;
    if (!o) return [];
    const picked = o.pairs ? pickOwn(o.targets, o.pairs) : o;
    return picked.paid > 0 && picked.paid >= ownLeast(o.targets)
      ? [{ place, r, o: { targets: o.targets, among: o.among, ...picked } }]
      : [];
  });
  // Where a run enacted the law, its payments are the law's; a repeal of a
  // law in force at the opening stops money only where the law pays as it
  // goes, so the repeal runs count only when no run enacted it. Lead with the
  // run whose reached targets most often got the payment.
  const enacted = own.filter(({ r }) => !r.inForceAtOpening);
  if (enacted.length) own.splice(0, own.length, ...enacted);
  own.sort((a, b) => b.o.paid / b.o.targets - a.o.paid / a.o.targets);
  // Posts that name the law are its payments; then its own payment to whom it
  // reached; a post that differs from the control world without naming it
  // counts only where its poster read the law.
  if (direct.length || cited.length || controlCited.length || own.length) {
    const ev = [
      ...cited.map(
        ({ place, c }) =>
          `${place}: posts citing ${c.token}: ${c.gross}${c.control === undefined ? "" : ` (control world ${c.control})`} (${c.ids[0]})`,
      ),
      ...controlCited.map(
        ({ place, c }) =>
          `${place}: in force in the control world, posts citing ${c.token}: ${c.gross} (${c.ids[0]})`,
      ),
      ...own.slice(0, 2).map(({ place, o }) => {
        const pays = (
          "near" in o && o.near?.length
            ? o.near
            : [
                {
                  kind: o.sample[0]!.kind,
                  way: o.sample[0]!.way ?? "in",
                  targets: o.paid,
                  first: o.sample[0],
                },
              ]
        )
          .slice(0, 3)
          .map(
            (n) =>
              `${n.targets} ${n.kind.split(" @ ")[0]} paid ${n.way} (${n.kind.split(" @ ")[1] ?? ""}; e.g. ${n.first?.target} on ${n.first?.date}: ${n.first?.control} in the control world, ${n.first?.treatment} here, ${n.first?.journal})`,
          );
        const among =
          o.among === "paid" ? "the law paid or charged" : "reached";
        return `${place}: of ${o.targets} ${among}, the payments that changed first: ${pays.join("; ")}`;
      }),
      ...direct
        .slice(0, 3)
        .map(
          ({ place, d }) =>
            `${place}: ${d.kind} ${d.control} -> ${d.treatment} (${d.ids[0] ?? ""})`,
        ),
    ].join("; ");
    return { status: "wired", evidence: ev, why: "" };
  }
  // The law's own applied rows say its terms bound nobody in any drawn place
  // (an estate under the exemption, a lease whose market rise stayed under the
  // cap): no dollar of its own moved, by its own records.
  if (
    runs.length &&
    runs.every(
      ({ r }) => r.applied && r.applied.rows > 0 && !r.applied.withAmount,
    )
  )
    return {
      status: "n/a",
      evidence: runs
        .map(
          ({ place, r }) =>
            `${place}: ${r.applied!.rows} applied rows, none with an amount owed, paid or held (e.g. ${r.applied!.sample[0]})`,
        )
        .join("; "),
      why: "its terms bound nobody in the drawn places: each of its applied rows records nothing owed, paid or held",
    };
  const any = runs.flatMap(({ place, r }) =>
    (r.money?.diff ?? []).map((d) => ({ place, d })),
  );
  // Money differs from the control world, but no post is the law's own: not by
  // a file that read it, not citing it, not to anyone it reached. The twin
  // worlds drift apart over a year, so such a difference is not the law's chain.
  if (any.length)
    return {
      status: "partial",
      evidence: any
        .slice(0, 3)
        .map(
          ({ place, d }) =>
            `${place}: ${d.kind} ${d.control} -> ${d.treatment} (${d.ids[0] ?? ""})`,
        )
        .join("; "),
      why: "money differs from the control world, but no post is the law's own: none by a file that read it, none citing it, none to anyone it reached",
      untraced: true,
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

/**
 * A link an engine carries: the research's outcome is produced by the engine
 * that applies the law (the jobs engine's hires counted in unemployment, a
 * town body legislating under a power), so the web leaves it alone. It counts
 * only where that engine read the law in the run (the systems link) and the
 * row names a real path ("none yet" is a gap).
 */
const carried = (l: { carriedBy?: string }) =>
  !!l.carriedBy && !/^none\b/.test(l.carriedBy);

function webLink(
  law: LawEntry,
  runs: { place: string; r: Result }[],
  systems: Link,
): Link {
  const links = webLinksOf(law);
  const gap = RESEARCH_GAPS.get(law.key);
  if (!links.length)
    return gap && stopgapOf(gap.stopgapId)?.open
      ? {
          status: "stopgap",
          evidence: "src/core2/data/laws/outcome-research-gaps.json",
          why: `no researched outcome-web link starts from this law or a measure it sets; the research would measure ${gap.outcome} (${gap.stopgapId})`,
        }
      : {
          status: "missing",
          evidence: "data/research/outcome-web/links.json",
          why: "no researched outcome-web link starts from this law",
        };
  // A link an engine now carries is not run by the web: a ledger row an
  // older run kept for it is history, not this link's evidence.
  const carriedNow = new Set(links.filter((l) => carried(l)).map((l) => l.key));
  const allFired = runs.flatMap(({ place, r }) =>
    (r.web?.fired ?? [])
      .filter((f) => !carriedNow.has(f.link))
      .map((f) => ({ place, f })),
  );
  // A fired ledger row whose factor no engine reads (unwired.json, open
  // stopgap) is a record, not wiring.
  const { read: fired, unread } = splitByReader(
    allFired,
    unwiredLinks.links,
    (id) => stopgapOf(id)?.open ?? false,
  );
  // A link the research puts at about zero is a researched result, not a
  // gap: there is nothing for the web to move (links.json, status about-zero).
  const zero = (l: { research: string }) => l.research === "about-zero";
  const byEngine = systems.status === "wired" ? links.filter(carried) : [];
  const built = links.filter(
    (l) => l.status === "built" && !zero(l) && !byEngine.includes(l),
  );
  const notBuilt = links.filter(
    (l) => l.status !== "built" && !zero(l) && !byEngine.includes(l),
  );
  if (!fired.length && byEngine.length && !notBuilt.length && !built.length)
    return {
      status: "wired",
      evidence: byEngine
        .map((l) => `${l.key}: carried by ${l.carriedBy} (${l.source ?? ""})`)
        .join("; "),
      why: "",
    };
  if (!fired.length && unread.length)
    return {
      status: "stopgap",
      evidence: unread
        .slice(0, 3)
        .map(
          ({ item: { place, f } }) =>
            `${place}: ${f.id} ${f.link} ${f.effect.toFixed(4)} (ledger row only)`,
        )
        .join("; "),
      why: `no production reader: ${[...new Set(unread.map((u) => `${u.item.f.link} (${u.stopgapId})`))].join(", ")} move only the web's ledger`,
    };
  if (fired.length) {
    const ev = fired
      .slice(0, 3)
      .map(
        ({ place, f }) =>
          `${place}: ${f.id} ${f.link} ${f.effect.toFixed(4)}${WEB_READERS.has(f.link) ? `, read by ${WEB_READERS.get(f.link)}` : ""}`,
      )
      .join("; ");
    const missing = [
      ...notBuilt.map((l) => `${l.key} (${l.status})`),
      ...new Set(
        unread.map((u) => `${u.item.f.link} (no reader, ${u.stopgapId})`),
      ),
    ];
    return missing.length
      ? {
          status: "partial",
          evidence: ev,
          why: `links not built or not read: ${missing.join(", ")}`,
        }
      : { status: "wired", evidence: ev, why: "" };
  }
  if (links.every(zero))
    return {
      status: "n/a",
      evidence: links
        .map((l) => `${l.key}: about-zero (${l.source ?? "links.json"})`)
        .join("; "),
      why: "the research puts every outcome link from it at about zero, so there is nothing for the web to move",
    };
  if (!built.length)
    return {
      status: "missing",
      evidence: links.map((l) => `${l.key}: ${l.status}`).join(", "),
      why: `every link is unbuilt: ${[...new Set(notBuilt.map((l) => l.status))].join(", ")}`,
    };
  // A built, sized link to a kept measure whose lag outlasts the run cannot
  // show its effect in it. It counts when the web read the law's cause as
  // changed in the run (differently from the control world): the effect then
  // lands the lag's months after that month row.
  // It also counts when the world itself changed the law back before the lag
  // ended: the cause the web read as changed did not last the link's lag, and
  // the law row that reversed it is named.
  const monthIndex = (month: string) =>
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));
  const lagged = runs.flatMap(({ place, r }) =>
    (r.web?.cause ?? [])
      .filter((c) => built.some((l) => l.key === c.link))
      .flatMap((c) => {
        if (c.lagMonths > (r.web.windowDays ?? 35) / 30)
          return [
            {
              place,
              text: `${c.link} lags ${c.lagMonths} months, past the run's window; the web read ${c.from} as ${c.treated} (control ${c.control}) in ${c.id} (${c.month})`,
            },
          ];
        const back = r.web.reenacted;
        return back &&
          back.value === c.control &&
          monthIndex(back.effectiveDate) - monthIndex(c.month) < c.lagMonths
          ? [
              {
                place,
                text: `${c.link} lags ${c.lagMonths} months; the web read ${c.from} as ${c.treated} (control ${c.control}) in ${c.id} (${c.month}), but the world put it back with ${back.id} on ${back.effectiveDate}, before the lag ended`,
              },
            ]
          : [];
      }),
  );
  if (lagged.length) {
    const ev = lagged
      .slice(0, 3)
      .map(({ place, text }) => `${place}: ${text}`)
      .join("; ");
    return notBuilt.length
      ? {
          status: "partial",
          evidence: ev,
          why: `links not built: ${notBuilt.map((l) => `${l.key} (${l.status})`).join(", ")}`,
        }
      : { status: "wired", evidence: ev, why: "" };
  }
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
    } else if (r.kind !== "question" && r.afterUndoChanged) {
      // Putting the old amount back leaves the law applying to the same people under the old row: the changed row's reach must end.
      if (r.reach.open === 0) continue;
      had += 1;
      if (r.afterUndoChanged.open === 0) ok += 1;
      notes.push(
        `${place}: ${r.reach.open} open under the changed row -> after the old amount is put back ${r.afterUndoChanged.open} still cite it`,
      );
    } else {
      if (r.reach.open === 0) continue;
      had += 1;
      // A row open after the repeal under a law a body passed in play (not
      // the checker's) is the world enacting it again, not the repeal failing;
      // it counts only when every open row is in the sample.
      const theWorlds =
        r.afterUndo.sample.length === r.afterUndo.open
          ? r.afterUndo.sample.filter(
              (id) => !r.lawIds.some((law) => id.includes(law)),
            )
          : [];
      if (r.afterUndo.open - theWorlds.length === 0) ok += 1;
      notes.push(
        `${place}: ${r.reach.open} open -> after repeal ${r.afterUndo.open} open, ${r.afterUndo.ended} ended${theWorlds.length ? ` (${theWorlds.length} under a law the world passed itself, ${theWorlds[0]})` : ""}`,
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
    screens: readonly { screen: string }[];
  }[],
): string {
  const lines = [
    "# Law wiring table",
    "",
    `Laws wired: ${rows.filter((r) => r.overall === "wired").length} of ${rows.length} (${rows.filter((r) => r.overall === "partly").length} partly, ${rows.filter((r) => r.overall === "stopgapped").length} on a stopgap). Research links reaching people or carried by an engine: ${LINK_COUNTS.reaching} of ${LINK_COUNTS.links} (${LINK_COUNTS.aboutZero} the research finds about zero, ${LINK_COUNTS.unread} unread, ${LINK_COUNTS.unreadWithNoStopgap} of them with no stopgap), from docs/reports/effect-web-matrix-2026-10-20.json, the one count of links.`,
    "",
    "Every law the game has, graded on the nine wiring links in two drawn places. Each cell is the link's status; the full law-wiring report gives every reason and record id. The last column names the screens a player sees the law on in a played world, read through the play page's own views (Your office lists it as a bill a member can draft).",
    "",
    "| Law | Family | " + LINKS.join(" | ") + " | Overall | Seen on |",
    "| --- | --- | " + LINKS.map(() => "---").join(" | ") + " | --- | --- |",
  ];
  for (const r of rows)
    lines.push(
      `| ${r.name} | ${r.family} | ${LINKS.map((k) => MARK[r.links[k]!.status]).join(" | ")} | ${r.overall} | ${r.screens.map((s) => s.screen.replace("Politics → ", "")).join(", ") || "none"} |`,
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

/**
 * Where a player sees each law (wiring-audit: "wired is not seen"): the
 * screens scripts/law-wiring/screens.ts read each law on in a played world.
 */
const SCREENS_FILE = "docs/reports/law-wiring-screens.json";
interface ScreensFile {
  places: {
    place: { key: string; name: string };
    runSeed: string;
    from: string;
    through: string;
  }[];
  laws: Record<string, { screen: string; evidence: string }[]>;
}
const screensRun: ScreensFile | null = existsSync(SCREENS_FILE)
  ? (JSON.parse(readFileSync(SCREENS_FILE, "utf8")) as ScreensFile)
  : null;

function main(): void {
  const files = process.argv.slice(2);
  const runs: PlaceRun[] = files.map(
    (f) => JSON.parse(readFileSync(f, "utf8")) as PlaceRun,
  );
  // One result per law and place: a later file (a family's newer run) replaces an earlier one.
  const byPlace = new Map<string, Map<string, { place: string; r: Result }>>();
  for (const run of runs)
    for (const r of run.results) {
      const places = byPlace.get(r.key) ?? new Map();
      places.set(run.place.key, {
        place: `${run.place.name}, ${run.place.state} (seed ${run.seed.slice(0, 16)})`,
        r,
      });
      byPlace.set(r.key, places);
    }
  const byKey = new Map(
    [...byPlace].map(([key, places]) => [key, [...places.values()]]),
  );
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
      links.web = webLink(law, rs, links.systems);
      links.knowing = knowingLink(rs);
      links.repeal = repealLink(rs);
      // A place with nobody for the law to bind is left out: reaching nobody
      // there is the statute's terms, not a place the wiring missed.
      const open = ({ r }: { r: Result }) =>
        r.inForceAtOpening ? r.openingReach.open : r.reach.open;
      const bindable = rs.filter(
        (p) => open(p) > 0 || p.r.subjects?.count !== 0,
      );
      const sameEverywhere =
        bindable.every((p) => open(p) > 0) ||
        bindable.every((p) => open(p) === 0);
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
    // A law that moves no money by its terms is declared so even where some
    // post differed from the control world without citing it: that money is
    // not the law's (a traced post, direct or citing the law, still wins).
    for (const [k, d] of Object.entries(DECLARED[law.key] ?? {}))
      if (
        links[k] &&
        (links[k]!.status !== "wired" ||
          (k === "money" && links[k]!.untraced && d.status === "n/a"))
      ) {
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
      screens: screensRun?.laws[law.key] ?? [],
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
    places: [
      ...new Map(
        runs.map((r) => [r.place.key, { seed: r.seed, ...r.place }]),
      ).values(),
    ],
    summary: {
      laws: rows.length,
      wired: rows.filter((r) => r.overall === "wired").length,
      partly: rows.filter((r) => r.overall === "partly").length,
      stopgapped: rows.filter((r) => r.overall === "stopgapped").length,
      // The research links, counted once (the effect matrix's grade).
      researchLinks: LINK_COUNTS,
      // Laws a player sees on at least one screen, and where that was read.
      shownOnAScreen: rows.filter((r) => r.screens.length).length,
      screensRead:
        screensRun?.places.map((p) => ({
          place: `${p.place.name} (${p.place.key})`,
          runSeed: p.runSeed,
          from: p.from,
          through: p.through,
        })) ?? [],
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
