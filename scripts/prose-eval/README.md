# Civic-prose blind-evaluation harness

Supports the controlled A/B/C/D prose experiment defined by the Drive runbook
(`01_BLIND_EVAL_RUNBOOK_AND_EVALUATOR_KEY — 2026-09-05`). The held-out fact
packets live only in Drive
(`00_HOLDOUT_FACT_PACKETS — BLIND EVAL — DO NOT USE AS SKILL EXAMPLES`) and are
never committed to this repository or copied into the civic-prose skill.

Principles enforced here:

- **Holdout hygiene** — `npm run prose:eval -- hygiene` fails if holdout
  material (packet ids or the holdout Drive document id) appears anywhere in
  `.claude/skills/civic-prose/` or `.claude/agents/civic-prose-writer.md`.
- **Blind review** — `npm run prose:eval -- bundle <run-dir> [seed]` turns raw
  configuration outputs into anonymized per-packet review files with a
  deterministic, per-packet shuffled version order, and seals the
  version→configuration mapping in `mapping.json`, which stays out of the
  owner-facing surface until verdicts are locked.
- **Owner preference is decisive** — this harness never scores, ranks, or
  judges prose, and no model judge is ever called from it.

## Run layout

Run directories live under `prose-eval-runs/` (gitignored; evaluation material
is working data, not repository content):

```
prose-eval-runs/wave-1/
  raw/<PACKET>__<CONFIG>.md   one file per packet per configuration (A|B|C|D)
  review/<PACKET>.md          generated: owner-facing anonymized versions
  mapping.json                generated: sealed version→configuration mapping
  MAPPING-README.txt          generated: seal warning
```

Raw outputs are saved verbatim (the harness warns on result-shape problems but
never cleans or fixes an output before judging). Configurations A, B, and C are
required per packet; D is optional.

Result classes follow the fact-packet output contract
(`.claude/skills/civic-prose/references/fact-packet-schema.md`):
`SAFE_RENDER`, `SAFE_RENDER_WITH_OMISSION`, `MISSING_CONTEXT`.
