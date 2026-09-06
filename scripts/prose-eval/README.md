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

## Holdout status after Wave 1

Wave 1 ran configurations A (engineering baseline, no Skill), B (isolated
model, packet + wrapper only), and C (the civic-prose specialist). The owner
verdicts were locked before unblinding
(`WAVE_1_OWNER_VERDICTS — LOCKED — 2026-09-05`) and analyzed in
`WAVE_1_UNBLIND_DIAGNOSIS — 2026-09-05`. C won on the primary metric with zero
POV and zero grounding failures; its remaining defects were style rules the
Skill did not yet contain, so the accepted next action was to revise the Skill
rather than change the model or raise effort. The specialist stays on its
Wave 1 model and low effort, and the A/B/C design is unchanged.

The twelve judged Wave 1 packets are retired from held-out status and may now
inform calibration examples. The sealed reserve packets remain fully unseen and
are the clean post-revision test; they must not be opened, cited, paraphrased,
or generated against until that round is authorized.

Holdout hygiene deliberately still rejects **every** `H-###` packet id in the
skill and agent files. Retiring the judged packets did not loosen the check:
the reserves share the id shape, so the broad rule is what protects them. The
Wave 1 defects are therefore encoded as quoted prose and repairs in
`.claude/skills/civic-prose/examples/rejected.jsonl` and the "Owner rules"
section of the prose contract, with no packet ids anywhere.

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
