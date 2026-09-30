import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const Ajv = require("ajv");
const schemaPath = fileURLToPath(
  new URL(
    "../../data/research/authorities/authorities.schema.json",
    import.meta.url,
  ),
);
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const validate = new Ajv({ allErrors: true }).compile(schema);
const args = process.argv.slice(2);
const ready = args.includes("--ready");
const files = args.filter((x) => !x.startsWith("--"));
if (!files.length) {
  console.error(
    "Usage: node scripts/research/validate-authorities.mjs <batch.json> [--ready]",
  );
  process.exit(2);
}
let failed = false;
for (const file of files) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const errors = [];
  if (!validate(data))
    errors.push(...validate.errors.map((e) => `${e.dataPath}: ${e.message}`));
  if (!errors.length) {
    const sources = new Set(data.sources.map((s) => s.id));
    if (sources.size !== data.sources.length)
      errors.push("Duplicate source IDs.");
    function refs(value, path = "$") {
      if (Array.isArray(value)) {
        value.forEach((v, i) => refs(v, `${path}[${i}]`));
        return;
      }
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "sources" && path !== "$") {
          for (const id of child)
            if (!sources.has(id)) errors.push(`${path}: missing source ${id}`);
        } else refs(child, `${path}.${key}`);
      }
    }
    refs(data);
    const topicIds = new Set();
    for (const topic of data.topics) {
      if (topicIds.has(topic.topicKey))
        errors.push(`Duplicate topic ${topic.topicKey}`);
      topicIds.add(topic.topicKey);
      const ids = new Set();
      for (const d of topic.decisions) {
        if (ids.has(d.id))
          errors.push(`${topic.topicKey}: duplicate decision ${d.id}`);
        ids.add(d.id);
        if (
          !d.examples.some((e) =>
            ["enacted", "passed chamber", "went to voters"].includes(e.status),
          )
        )
          errors.push(
            `${d.id}: needs qualifying law/measure example; agency action alone is insufficient.`,
          );
        for (const [place, cell] of Object.entries(d.availability)) {
          if (cell.status !== "unresearched" && !cell.sources.length)
            errors.push(
              `${d.id}/${place}: sourced availability has no source.`,
            );
          if (cell.status === "no" && !cell.bars.length)
            errors.push(
              `${d.id}/${place}: barred decision has no changeable-law record.`,
            );
          if (
            cell.status === "only some localities" &&
            !cell.localGrant &&
            ready
          )
            errors.push(`${d.id}/${place}: local grant still missing.`);
        }
        for (const [place, law] of Object.entries(d.startingLaw))
          if (law.status !== "unresearched" && !law.sources.length)
            errors.push(`${d.id}/${place}: starting law has no source.`);
        for (const e of d.effects) {
          if (
            typeof e.size === "number" &&
            (!e.range || !e.study || !e.sources.length)
          )
            errors.push(`${d.id}: sized effect needs range, study and source.`);
          if (e.range && e.range.low > e.range.high)
            errors.push(`${d.id}: inverted effect range.`);
          if (e.size === "no sized evidence" && (e.range || e.study))
            errors.push(
              `${d.id}: unsized effect cannot carry a numeric study/range.`,
            );
        }
      }
      for (const r of topic.systemRedesigns)
        for (const piece of r.pieces)
          for (const id of piece.decisionIds)
            if (!ids.has(id))
              errors.push(`${r.id}: missing piece decision ${id}`);
      if (ready && topic.remainingWork.length)
        errors.push(`${topic.topicKey}: topic work remains.`);
      if (ready && !topic.decisions.length)
        errors.push(`${topic.topicKey}: no admitted decisions.`);
      if (
        ready &&
        topic.federalLink.some((l) => l.topicKey.includes("UNRESOLVED"))
      )
        errors.push(`${topic.topicKey}: unresolved federal link.`);
    }
    if (ready && data.remainingWork.length) errors.push("Batch work remains.");
    if (
      ready &&
      data.verification.some(
        (v) => !["verified", "corrected"].includes(v.status),
      )
    )
      errors.push("Worked-example verification remains.");
    if (ready && data.status !== "ready for CTO review")
      errors.push("Batch is a research draft.");
    const ds = data.topics.flatMap((t) => t.decisions);
    const cells = ds.flatMap((d) => Object.values(d.availability));
    console.log(
      `${file}: ${data.topics.length} topics, ${ds.length} decisions, ${cells.length} availability cells, ${cells.filter((c) => c.status === "unresearched").length} unresearched, ${data.verification.filter((v) => ["verified", "corrected"].includes(v.status)).length}/${data.verification.length} verification rows resolved.`,
    );
  }
  for (const e of errors) console.error(e);
  console.log(
    `${file}: ${errors.length ? "FAIL" : "PASS"} ${ready ? "readiness" : "draft schema and evidence structure"} (source truth still requires CTO review).`,
  );
  if (errors.length) failed = true;
}
process.exitCode = failed ? 1 : 0;
