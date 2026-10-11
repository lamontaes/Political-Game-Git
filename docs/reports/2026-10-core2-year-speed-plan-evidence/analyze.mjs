/* global process */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { URL } from "node:url";
const directory = new URL(".", import.meta.url);
const rank = (object) =>
  Object.entries(object)
    .sort((a, b) => b[1] - a[1])
    .map(([name, seconds]) => ({ name, seconds }));
for (const index of process.argv.length > 2
  ? process.argv.slice(2).map(Number)
  : [0, 1, 2]) {
  const profile = JSON.parse(
    gunzipSync(readFileSync(new URL(`${index}.cpuprofile.gz`, directory))),
  );
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes)
    for (const child of node.children ?? []) parents.set(child, node.id);
  const self = {},
    inclusive = {},
    steps = {},
    modules = {},
    cross = {};
  let excluded = 0,
    total = 0;
  const url = (node) => node.callFrame.url;
  const fn = (node) => node.callFrame.functionName;
  const key = (node) =>
    `${fn(node) || "(anonymous)"} ${url(node).includes("/src/") ? url(node).slice(url(node).indexOf("/src/") + 1) : url(node)}`;
  const special = (node) => {
    const f = fn(node),
      u = url(node);
    if (f === "(garbage collector)") return "Garbage collection";
    if (f === "verify" && u.includes("/core2/finance-plan"))
      return "Read-log validation";
    if (
      [
        "field",
        "payload",
        "mapGet",
        "mapHas",
        "member",
        "members",
        "keys",
        "array",
        "size",
        "readSource",
      ].includes(f) &&
      u.includes("/core2/finance-plan")
    )
      return "Read recording";
    if (
      [
        "detach",
        "detached",
        "shallow",
        "copy",
        "copyResolved",
        "protectJournalObjects",
        "guardedRecord",
      ].includes(f) &&
      u.includes("/core2/")
    )
      return "Copying and freezing";
    return null;
  };
  const broad = (node) => {
    const f = fn(node),
      u = url(node);
    if (u.includes("/core2/journal-state") || u.endsWith("/core2/journal.ts"))
      return "Journal posting and checks";
    if (u.includes("/core2/work-pay-period")) return "Pay-period calculations";
    if (
      u.includes("/core2/finance-plan") ||
      u.includes("/core2/finance-cash") ||
      u.includes("/core2/act-cash")
    )
      return "Finance planning and authority";
    if (u.includes("/core2/work-attendance")) return "Attendance remainder";
    if (u.includes("/core2/work-payroll")) return "Payroll remainder";
    if (f === "chooseAct" || u.includes("/core2/choice"))
      return "Choice scoring";
    if (f === "availableActs") return "Offer enumeration";
    if (["refreshNeeds", "projectWorkNeeds"].includes(f)) return "Need refresh";
    return null;
  };
  for (let i = 0; i < profile.samples.length; i++) {
    const seconds = profile.timeDeltas[i] / 1e6,
      stack = [];
    let id = profile.samples[i];
    while (id !== undefined) {
      stack.push(nodes.get(id));
      id = parents.get(id);
    }
    if (stack.some((n) => url(n) === "node:inspector" && fn(n) === "post")) {
      excluded += seconds;
      continue;
    }
    total += seconds;
    const sk = key(stack[0]);
    self[sk] = (self[sk] ?? 0) + seconds;
    for (const k of new Set(stack.map(key)))
      inclusive[k] = (inclusive[k] ?? 0) + seconds;
    const step =
      stack.map(special).find(Boolean) ??
      stack.map(broad).find(Boolean) ??
      "Other simulation and runtime";
    const has = (name) => stack.some((n) => fn(n) === name);
    const module = has("(garbage collector)")
      ? "Runtime / garbage collection"
      : has("createLifeCore")
        ? "Opening / initialization"
        : stack.some((n) => url(n).includes("/core2/work-payroll"))
          ? "Work / payroll dispatch and settlement"
          : has("runScheduledWork")
            ? "Work / scheduled attendance"
            : has("runFinanceDay") ||
                stack.some((n) => url(n).includes("/core2/modules/finance"))
              ? "Finance / dated contracts"
              : has("activate")
                ? "Life / discretionary activation"
                : ["duePeople", "advanceDate"].some(has)
                  ? "Clock / due actors"
                  : ["compactRoutineMetrics", "compactQuietWorkResults"].some(
                        has,
                      )
                    ? "Retention / compaction"
                    : has("runModuleCalendar")
                      ? "Module calendar"
                      : "Other simulation and runtime";
    steps[step] = (steps[step] ?? 0) + seconds;
    modules[module] = (modules[module] ?? 0) + seconds;
    cross[module] ??= {};
    cross[module][step] = (cross[module][step] ?? 0) + seconds;
  }
  writeFileSync(
    new URL(`${index}-analysis.json`, directory),
    JSON.stringify(
      {
        index,
        totalSeconds: total,
        excludedProfilerControlSeconds: excluded,
        profileDurationSeconds: (profile.endTime - profile.startTime) / 1e6,
        samples: profile.samples.length,
        steps: rank(steps),
        modules: rank(modules),
        cross,
        self: rank(self).slice(0, 60),
        inclusive: rank(inclusive).slice(0, 80),
        method:
          "timeDeltas[i]; each retained sample in one module and one step; recursion counted once for inclusive witnesses; deepest matching special step then deepest broad match",
      },
      null,
      2,
    ) + "\n",
  );
}
