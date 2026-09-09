/** Account for every named municipal report in the declared existing packets.
 * This inventories attributed research text; it does not infer legal rules or geographic joins.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./registry";

const root = resolve(
  REPO_ROOT,
  "data/source/municipal-governance/research-packets",
);
const stateText = readFileSync(
  resolve(REPO_ROOT, "src/simulation/life-places.ts"),
  "utf8",
);
const states = new Map(
  [...stateText.matchAll(/ {2}([A-Z]{2}): \{ name: "([^"]+)"/g)].map((m) => [
    m[2]!,
    m[1]!,
  ]),
);
const packets = ["43A", "44", "45", "46", "92I"];
const reports: {
  packet: string;
  heading: string;
  state: string;
  name: string;
  line: number;
  text: string;
  citedUrls: string[];
  status: string;
}[] = [];
const controls: {
  packet: string;
  heading: string;
  line: number;
  reason: string;
}[] = [];
const files = packets.map((packet) => {
  const bytes = readFileSync(resolve(root, `${packet}.txt`));
  const lines = bytes.toString("utf8").split(/\r?\n/);
  let context: string | null = null;
  const headings = lines.flatMap((line, index) => {
    const m = line.match(/^(#{1,3}) (.+)$/);
    return m ? [{ depth: m[1]!.length, title: m[2]!, index }] : [];
  });
  for (let h = 0; h < headings.length; h++) {
    const heading = headings[h]!;
    const prefix = heading.title.split(/ — | – /)[0]!;
    if (heading.depth === 1) context = null;
    const state = states.get(prefix);
    if (heading.depth === 2) context = state ?? null;
    let name: string | null = null;
    let stateCode: string | null = null;
    const comma = prefix.lastIndexOf(", ");
    if (comma !== -1 && states.has(prefix.slice(comma + 2))) {
      name = prefix.slice(0, comma);
      stateCode = states.get(prefix.slice(comma + 2))!;
    } else if (
      heading.depth === 3 &&
      context &&
      ["44", "45"].includes(packet)
    ) {
      name = prefix;
      stateCode = context;
    }
    const text = lines
      .slice(heading.index + 1, headings[h + 1]?.index ?? lines.length)
      .join("\n")
      .trim();
    const rejected =
      !name ||
      !stateCode ||
      /^(Additional |Statewide |Hawaii art|Alaska art)/.test(name);
    if (rejected) {
      controls.push({
        packet,
        heading: heading.title,
        line: heading.index + 1,
        reason:
          "Control, statewide, non-municipal, or unnamed family section; retained in packet, not invented as a government.",
      });
      continue;
    }
    const citedUrls = [...new Set(text.match(/https?:\/\/[^\s<>`]+/g) ?? [])];
    reports.push({
      packet,
      heading: heading.title,
      state: stateCode!,
      name: name!,
      line: heading.index + 1,
      text,
      citedUrls,
      status: /^Status: PENDING/m.test(text)
        ? "PENDING"
        : "ATTRIBUTED_RESEARCH",
    });
  }
  return {
    packet,
    path: `data/source/municipal-governance/research-packets/${packet}.txt`,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    rights: "UNKNOWN",
    usage: "Existing research reference; not a production legal artifact.",
  };
});
const result = { schemaVersion: 1, files, reports, controls };
writeFileSync(
  resolve(
    REPO_ROOT,
    "data/source/municipal-governance/research-inventory.json",
  ),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `Inventoried ${reports.length} named reports and ${controls.length} control sections; no legal or place joins inferred.`,
);
