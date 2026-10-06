import { readFileSync } from "node:fs";
import process from "node:process";

// Every sampled self weight enters exactly one nearest-source bucket.
// This attributes native allocations without summing overlapping ancestors.
const stages = process.argv.slice(2).map((path) => {
  const data = JSON.parse(readFileSync(path, "utf8"));
  const buckets = new Map();
  const paths = [];
  let denominator = 0;
  function visit(node, ancestors) {
    const stack = [...ancestors, node.callFrame];
    const weight = node.selfSize ?? 0;
    denominator += weight;
    const owner = stack.findLast((frame) =>
      /\/(src|scripts\/dev-lab)\//.test(frame.url),
    );
    const key = JSON.stringify(owner ?? { functionName: "unattributed" });
    buckets.set(key, (buckets.get(key) ?? 0) + weight);
    if (weight > 0) paths.push({ weight, stack: stack.slice(-12) });
    for (const child of node.children ?? []) visit(child, stack);
  }
  visit(data.profile.head, []);
  const owners = [...buckets].map(([key, weight]) => ({
    frame: JSON.parse(key),
    weight,
    percent: denominator ? (100 * weight) / denominator : 0,
  }));
  owners.sort((a, b) => b.weight - a.weight);
  paths.sort((a, b) => b.weight - a.weight);
  return {
    stage: data.stage,
    denominator,
    owners: owners.slice(0, 30),
    remainingOwnerWeight: owners
      .slice(30)
      .reduce((sum, item) => sum + item.weight, 0),
    topAllocationStacks: paths.slice(0, 10),
  };
});
process.stdout.write(
  JSON.stringify(
    {
      method:
        "Estimated surviving allocation self weights attributed once to nearest source frame; no dominator/reference-root proof, CPU timing or call counts. Native frames inherit source caller. All nodes form denominator.",
      stages,
    },
    null,
    2,
  ) + "\n",
);
