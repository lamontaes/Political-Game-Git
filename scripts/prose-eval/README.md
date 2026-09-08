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

## Grounding gate

The blind reserve round found that the Skill materially improves owner-preferred
prose and still shipped a repeated hard-grounding pattern: invented dates,
invented delivery/staging, and one actor's silence widened to a group. A generic
self-check was already in the Skill when that happened, so the repair is a
separate, enforced verification stage rather than stronger wording.

Two mechanisms, both development-time. Shipped play never calls a model.

### Deterministic gate (no model call)

```
npm run prose:eval -- ground <packet-file> <output-file>
npm run prose:eval -- probes
```

`ground` prints `GROUNDING: PASS` or the specific unsupported claims and exits
non-zero when it finds any. It checks the classes that actually failed review:

- invented day/date/relative-day labels, and months only in a dated context so
  the modal "may" is not misread as the month;
- invented times — clock (`2 p.m.`) and approximate/colloquial (`around 11`)
  alike;
- invented delivery or staging;
- one actor's non-action widened to a group;
- player identity: a gendered pronoun with no same-gender actor the packet
  establishes, so an NPC's `he` never licenses the player's `she`, checked from
  the SURFACE's declared register (the word "brief" in an OUTPUT REQUEST no
  longer switches the check off);
- a task-note surface staged as dialogue, regardless of a stray quotation mark
  elsewhere in the packet;
- a malformed result envelope: an unknown result class, a missing required
  field, or bare chatter outside the allowed shape. The full prose payload is
  parsed — every prose line, not just the first — so a claim on a later line is
  still checked.

It is a floor, not a proof of grounding. Every check is conservative and fires
only when the packet supplies no support at all for that class; where a packet
supplies partial support (some clock time, say) it defers to the reviewer rather
than guessing at precision. It never rewrites prose.

`probes` runs the fresh synthetic probes in `fixtures/grounding/`. Those probes
were written for this repair and contain no retired-holdout material; the same
files back `grounding.test.ts`, so a regression fails in CI.

### Grounding reviewer (model-backed, semantic)

The `civic-prose-grounding-reviewer` agent compares a candidate output against
the exact packet claim by claim and returns `GROUNDING: PASS` or the specific
unsupported claims. It never rewrites prose and never judges style.

Its reply is untrusted text, so `parseReviewerVerdict` is fail-closed: anything
that is not an unambiguous `GROUNDING: PASS` — a malformed reply, a verdict
wrapped in commentary, an `UNSUPPORTED` block naming no claim — is not a pass.

That parser is enforced through a CLI command, not left as library code with no
caller:

```
npm run prose:eval -- verify-review <reviewer-reply-file>
```

`verify-review` reads the reviewer's reply from a file (its deterministic
development interface) and exits zero **only** when that reply is exactly a
valid `GROUNDING: PASS`. An `UNSUPPORTED`, malformed, partial, extra-text,
ambiguous, or empty reply exits non-zero. It never rewrites prose, never scores
style, and never treats the mere presence of reviewer output as a pass.

Model pinning is verified, not assumed. `model:` frontmatter is honoured;
**`effort:` is not** — launching by frontmatter alone runs the writer at effort
`high` rather than the specified `low`, so `--effort low` must be passed on the
command line and the served configuration confirmed in the session transcript.

## Codex portability

The repository-native `$civic-prose` skill is at
`.agents/skills/civic-prose/SKILL.md`. Its entire contents are byte-identical to
`.claude/skills/civic-prose/`, which remains the editorial authority. The
portability regression checks the complete file inventory and bytes, the
complete developer-instruction bodies, constrained TOML envelopes, and holdout
hygiene. Each role permits only its exact, closed Codex prefix followed by the
accepted Claude editorial body with `.claude/skills/` adapted to `.agents/skills/`.
No additional prefix, insertion, or suffix is allowed. In-memory adversarial
regressions cover those overrides, path drift, and altered instructions; the
provider files are never mutated by these tests.
The `hygiene` command also scans both Codex agents and the Codex skill tree.

The separate read-only project agents are:

- `.codex/agents/civic-prose-writer.toml`
- `.codex/agents/civic-prose-grounding-reviewer.toml`

No model or effort is pinned in the skill or agents. Choose these at session
launch. The writer explicitly reads the repository skill; there is no assumed
Claude-style skill preload. No runtime model calls or source rewrites are added.

Explicit writer prompt:

```text
Use $civic-prose. Invoke civic-prose-writer with the following one canonical
FACT PACKET. Return the child's raw result envelope unchanged.
<packet>
```

Independent reviewer prompt (new session, no writer reasoning):

```text
Invoke civic-prose-grounding-reviewer with exactly this FACT PACKET and
CANDIDATE OUTPUT. Return its raw verdict unchanged. Do not rewrite prose.
<packet>
<candidate>
```

Read the actual child output, not a parent summary. Run `ground` on the writer
output and `verify-review` on the reviewer's exact reply. Neither a writer's
self-check nor a parent's claim that review passed is independent acceptance.
Owner style acceptance remains separate from grounding.

### Separate-session fallback

If a Codex surface cannot select a custom agent by name, keep using the
repository skill and start a fresh read-only session with the corresponding
TOML's `developer_instructions` as the session configuration. Do not resume or
fork the writer to make a reviewer. Supply only the exact packet and candidate
to the reviewer. This preserves one role definition instead of another prompt
copy. For example, with Python 3.11+ and the Codex CLI, run from the repo root:

```python
import json
import subprocess
import tomllib
from pathlib import Path

role = "civic-prose-grounding-reviewer"  # or civic-prose-writer
config = tomllib.loads(Path(f".codex/agents/{role}.toml").read_text())
prompt = Path("/absolute/path/review-input.txt").read_text()
# For the writer, the input explicitly invokes $civic-prose plus one packet.
subprocess.run(
    [
        "codex", "exec", "--strict-config", "-C", str(Path.cwd()),
        "-s", config["sandbox_mode"],
        "-c", "developer_instructions=" + json.dumps(config["developer_instructions"]),
        "-o", "/absolute/path/raw-reply.txt", "-",
    ],
    input=prompt, text=True, check=True,
)
```

The fallback uses the caller's model/effort settings; no model pin is embedded.
Keep temporary inputs and outputs outside the skill/example trees. This is a
manual development-time invocation, never part of the game's execution path.
