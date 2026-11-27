import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

process.chdir(
  execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim(),
);
const instruction =
  "Keep proof images out of Git. Save local captures under the ignored `test-results/proof/<item>/` directory and attach them to the pull request body or a PR comment. If direct attachment is unavailable, link the PR's CI artifact. Record the seed, viewport and proof step there.";
const rules = [
  [
    "play-first/SKILL.md",
    /^- \*\*Screenshots in a PR body do not render.*$/m,
    `- **Proof images belong on the pull request.** ${instruction}`,
  ],
  [
    "play-first/references/bench-and-browser.md",
    /^- \*\*Browser checks rewrite tracked screenshots.*$/m,
    `- **Keep browser proof off the branch.** ${instruction} Older checks may still write to tracked paths. Move only the captures from your run to the ignored directory and leave tracked evidence unchanged.`,
  ],
  [
    "screen-to-mock/SKILL.md",
    /^- \*\*Browser checks write their screenshots.*$/m,
    `- **Keep browser proof off the branch.** ${instruction} For a legacy checker with a fixed tracked path, keep only the captures from your run as local proof and leave tracked evidence unchanged.`,
  ],
  [
    "merger/references/train-gate.md",
    /^- Bring the old PR's change with.*$/m,
    "- Carry the old PR’s code and documentation changes, excluding proof captures. Reattach the captures to the new PR or link the original review artifact. Read both conflict sides. If the train already implements the change, keep the train's version and say so in the PR body.",
  ],
  [
    "words-engine/references/checks.md",
    /^- \*\*The machine's limits\.\*\*.*$/m,
    `- **The machine's limits.** Run one world test at a time. \`tests/golden-path/path-check.ts\` needs \`node --max-old-space-size=6144\`. A bench browser check needs \`BENCH_BROWSER=/opt/pw-browsers/chromium\` in a cloud container. ${instruction} For a legacy checker with a fixed tracked path, keep only the captures from your run and leave the tracked path unchanged. Vitest here swallows \`console.log\`, so write evidence lines with \`process.stdout.write\`.`,
  ],
  [
    "words-engine/references/checks.md",
    /^- \*\*A screenshot needs the full checkout\.\*\*.*$/m,
    "- **A screenshot needs the full checkout.** A sparse copy has no images, so the bench there draws empty rooms. Take before and after on the full checkout on one bench seed (detached at `origin/main`, then at the branch), then return it to its own branch. Attach both captures to the PR.",
  ],
  [
    "room-spots/references/people-pack.md",
    /^Screenshots go in the PR body as paths.*$/m,
    instruction,
  ],
];
const pending = new Map();
function edit(file, anchor, replacement) {
  const text = pending.get(file) ?? readFileSync(file, "utf8");
  if (text.includes(replacement)) return;
  if (!anchor.test(text))
    throw new Error("Missing proof-policy anchor in " + file);
  pending.set(
    file,
    text.replace(anchor, () => replacement),
  );
}
for (const [relative, anchor, replacement] of rules)
  for (const root of [".claude", ".agents"])
    edit(`${root}/skills/${relative}`, anchor, replacement);
edit(
  "AGENTS.md",
  /^(# .+)$/m,
  readFileSync("AGENTS.md", "utf8").match(/^# .+$/m)[0] + "\n\n" + instruction,
);
const line =
  '          node scripts/guards/no-doc-proof-images.mjs "$base" HEAD';
edit(
  ".github/workflows/validate.yml",
  /^ {10}CHANGED_FILES=(.*)$/m,
  readFileSync(".github/workflows/validate.yml", "utf8").match(
    /^ {10}CHANGED_FILES=.*$/m,
  )[0] +
    "\n" +
    line,
);
for (const [file, text] of pending) writeFileSync(file, text);
console.log(`Updated ${pending.size} proof-policy files.`);
