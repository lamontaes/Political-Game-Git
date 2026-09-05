# Claude / Project Operating-Mode Audit

Overnight audit, 2026-09-05. How Claude Code has actually been used on Our Civic Duty, measured against **current, verified** guidance — with first-party guidance kept strictly separate from community anecdote, and the owner's specific screenshot-claims adjudicated one by one.

Sources were fetched live in Sept 2026. First-party = `code.claude.com/docs`, `anthropic.com/engineering`, `anthropics/claude-code`. Community = Reddit/GitHub-issues/engineering-blogs, tagged with confidence.

---

## 1. How this project already operates (and it is unusually good)

The observed practice on this repo already implements most of what the current long-running-agent guidance recommends — often at a higher standard than the average project.

| Practice in use here                                                                                                                            | What it maps to in current guidance                                                                                                                                | Verdict                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Drive canonical authority chain** (00_READ_FIRST → canonical index → decision register → assignment board → append-only ledger → system docs) | "Durable state on disk, not in context"; the planning-with-files pattern (`task_plan`/`findings`/`progress`); "quickly understand state on a fresh context window" | **Exemplary.** This is the single highest-leverage tactic in the literature, done at project scale. |
| **One writer per branch/PR + isolated worktrees + `npm run agent:preflight`** (verify workspace, branch, local SHA, upstream SHA)               | First-party worktree fan-out; "leave the environment clean & mergeable"                                                                                            | **Matches** first-party migration/fan-out guidance.                                                 |
| **Completion reports must carry exact SHA, git state, tests actually run, remaining defects, acceptance state**                                 | "Show evidence (commands/output), don't assert success"; trust-then-verify gap                                                                                     | **Matches.**                                                                                        |
| **"Green CI ≠ human visual acceptance"; "semantic visible controls require actual pointer & keyboard tests"**                                   | The verify loop + browser verification (Playwright/Chrome); adversarial fresh-context review                                                                       | **Matches**, and correctly treats CI as necessary-not-sufficient.                                   |
| **"After substantial tasks, do a small LEARN pass; encode lessons in the smallest durable mechanism"**                                          | Structured note-taking / external memory                                                                                                                           | **Matches.**                                                                                        |
| **"Do not solve recurring process problems by making prompts larger"**                                                                          | "Bloated CLAUDE.md causes Claude to ignore instructions"; prefer hooks/skills                                                                                      | **Matches** first-party CLAUDE.md guidance exactly.                                                 |
| **Personal skill created in Packet 14** (`~/.claude/skills/political-game/SKILL.md`, durable execution rules only)                              | "Move sometimes-relevant knowledge into skills so it loads on demand"                                                                                              | **Matches.**                                                                                        |
| **Deterministic tooling / fixtures / replay everywhere** (`demo`, `validate`, art pipeline, and now the narrative corpus)                       | "Give Claude a runnable pass/fail check"                                                                                                                           | **Matches**, and this run added a narrative one.                                                    |
| **Auto-memory in use; `CLAUDE_CODE_DISABLE_CRON=1` set machine-wide**                                                                           | Memory tool; no scheduled automation                                                                                                                               | **Matches** the owner's stated policy.                                                              |

**Conclusion:** the project does not have an operating-discipline problem. The improvements below are refinements at the margin, not a turnaround.

---

## 2. Verified FIRST-PARTY guidance worth adopting or reaffirming

Direct from `code.claude.com/docs` and Anthropic engineering (Sep–Nov 2025 material):

1. **Context is the #1 constraint.** Performance degrades as the window fills ("context rot"). Track with `/context`; front-load goals/constraints early; aim for the smallest high-signal token set.
2. **`/clear` between unrelated tasks**, and **after ~2 failed corrections on the same issue restart fresh** with a sharper prompt — "a clean session with a better prompt almost always outperforms a long session with accumulated corrections." Named failure modes to avoid: kitchen-sink session, over-specified CLAUDE.md, trust-then-verify gap, infinite exploration.
3. **`/compact` exists and takes instructions** (`/compact Focus on …`); customize what survives via CLAUDE.md ("When compacting, always preserve the full list of modified files and test commands"). Project-root CLAUDE.md is re-read from disk after `/compact`.
4. **`/goal` is real and first-party** (`code.claude.com/docs/en/goal`): it loops the session until a **Haiku evaluator** confirms a condition **the transcript can prove**, with a turn cap; the loop is force-stopped after a stall. It is a within-session completion loop, **distinct from `/loop`** (a time-interval scheduler — which is out of scope here given `CLAUDE_CODE_DISABLE_CRON=1`).
5. **Long-running-agent harness** (Anthropic Engineering, Nov 2025): the key is letting a fresh context understand state fast — commit progress with descriptive messages; keep a progress log + a pass/fail feature list; provide an `init.sh`; on session start run `pwd`, read git log + progress, pick the highest-priority incomplete item, restart env, do basic e2e before new work. **"Compaction alone isn't sufficient."**
6. **Context engineering** = compaction + **structured note-taking** (external `NOTES.md`-style files) + **sub-agent architectures** (specialized agents with clean windows returning ~1–2k-token summaries).
7. **CLAUDE.md discipline**: read every conversation, it is _context, not enforced config_; keep it <~200 lines; include only what Claude can't infer; **to hard-enforce a must-happen step, use a hook, not prose.** `.claude/rules/` (optionally path-scoped) modularizes instructions.
8. **Subagents**: default **concurrent** cap is **20** (configurable; exempt under ultracode); there is **no total-per-session cap**. Multi-agent uses ~15× the tokens and is a **poor fit for interdependent coding subtasks** — reserve big fan-outs for genuinely independent research/audit/migration.
9. **Model routing**: Haiku for simple, Sonnet for most, Opus/frontier for the hardest reasoning. Verification via `/code-review`, Stop hooks, or a fresh-context reviewer that sees only the diff (tell it to flag only correctness/requirement gaps, or it over-reports → over-engineering).

---

## 3. COMMUNITY anecdote (useful, but verify before relying)

Tagged by confidence; treat as leads, not doctrine.

- **[high] planning-with-files** (Manus-style): "Context = RAM, Filesystem = Disk." Keep `task_plan.md` / `findings.md` / `progress.md`; a `UserPromptSubmit` hook re-injects the active plan each turn without spending fresh tokens; `SessionStart`/`PreCompact` hooks rebuild state from disk. Directly kills repeated repository archaeology. _This project already does the Drive-chain equivalent; the in-repo hook version is the increment._
- **[high] Auto-compact is a reported failure class** for long runs (`anthropics/claude-code` #10948/#13112/#27955: mid-task context loss, hallucination, lost plan context). Takeaway: **don't trust auto-compact mid-task; checkpoint to disk and handoff on your own terms.** (This _contradicts_ the docs' reassuring framing of auto-compact — the cautious stance is better supported for unattended work.)
- **[high] Ralph Wiggum loop**: keep an agent autonomous for hours by re-running the _same_ prompt on a fresh-ish context each iteration that re-reviews git history; requires **objective completion criteria** and a git-tracked dir; explicitly **not** for ambiguous/architectural/security/exploratory work. (Achieves long duration by _resetting_ context + leaning on disk/git — same principle as "short sessions win.")
- **[medium] `/compact` at ~60%** (not 95%) while recall is clear — community heuristic, directionally endorsed by first-party but the 60% number is not first-party.
- **[medium] Subagent sweet spot 2–5 concurrent** for interdependent code; beyond ~6 → split into separate sessions. Community numbers, not first-party, but consistent with Anthropic's caution.
- **[high] Browser verify loop** (Playwright MCP / Claude Code Chrome): drive the live app via the **accessibility tree** (stable refs), not pixel-guessing screenshots; the highest-value use is proving a change works before a human looks.
- **[medium] Reddit consensus**: short focused sessions beat marathons; checkpoint before autonomous work and **roll back rather than fix-forward** in a degraded session; run Opus main + Sonnet subagents each in a worktree.

---

## 4. The owner's specific screenshot-claims, adjudicated

| Claim                                              | Verdict                        | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A `/goal` command exists for long agentic tasks    | **CONFIRMED (first-party)**    | `code.claude.com/docs/en/goal`; evaluator-gated session loop with turn cap. The community "introduced in v2.1.139" version is **unverified**.                                                                                                                                                                                                                                                                                                                            |
| What `/compact` does; manual vs auto               | **CONFIRMED**                  | `/compact [instructions]` compacts on demand; auto-compact fires near the limit but is unreliable mid-task — prefer disk checkpoint + handoff for unattended runs.                                                                                                                                                                                                                                                                                                       |
| `/clear` between unrelated tasks                   | **CONFIRMED (recommended)**    | Also after ~2 failed corrections. Note: `/clear` wipes an active `/goal` — re-issue it.                                                                                                                                                                                                                                                                                                                                                                                  |
| "Large numbers of subagents"                       | **CAUTIONED**                  | Concurrent cap 20 (no per-session cap; ultracode-exempt). Big fan-outs are a **poor fit for interdependent code** (~15× tokens). The "200-per-session cap" community claim is **FALSE** (contradicts first-party).                                                                                                                                                                                                                                                       |
| "Fable 5.1 burns tokens → delegate to Sonnet/Opus" | **PARTLY TRUE, and MOOT here** | Fable is token-heavy (always-on thinking, whole-file rewrites, ~30% tokenizer inflation), but the "3× Sonnet" figure is community. **This run is Opus 4.8 ($5/$25), not Fable** — do not mechanically delegate. The real cost lever is assigning **cheaper-model subagents** to bulk work, not switching the main model. Anthropic's framing is the reverse of the screenshot's: route _bulk_ to cheaper models, _reserve_ the frontier model for the hardest reasoning. |

---

## 5. Concrete, safe improvements

### Implemented this run (additive, reversible, on the overnight branch — not merged)

- **A root `CLAUDE.md` bridge** — see §6. The repo's superb operating rules live in `AGENTS.md`, which Claude Code does **not** guarantee to auto-load (it auto-loads `CLAUDE.md`). A tiny root `CLAUDE.md` that imports `AGENTS.md` and points at the Drive chain + this audit ensures every Claude Code session starts grounded. **This is the single highest-value operating fix and it is safe.**
- **A durable in-repo progress file** for this run (`docs/overnight-audit/00-PROGRESS-AND-STATE.md`) — demonstrates the planning-with-files pattern in-repo; a future long lane can copy the shape.
- **A machine-checkable narrative signal** (`npm run corpus:narrative` → lint deltas) — the verify-loop applied to prose.

### Recommended (config/behaviour — owner to decide; do not impose)

1. **Adopt a per-lane durable plan file** (`docs/plans/active/<lane>.md` already exists as a convention) as a checkboxed `task_plan`/`progress` so any lane resumes at its current phase instead of re-exploring. (Anti-archaeology.)
2. **Use `/goal` for READY-NOW coding lanes** with a verifiable condition — e.g. `npm run validate` exits 0 and `git status` clean — bounded by a turn cap, paired with auto mode + an `--allowedTools` allowlist for exactly the commands the lane needs. (`/loop`/cron stay off per policy.)
3. **Keep subagent fan-out modest for code** (≤~5 concurrent for interdependent work); reserve big fan-outs (like this run's 5-way subsystem map and 3-way research) for genuinely independent read-only work; **assign Haiku/Sonnet to bulk subagents** to cut cost while keeping Opus for hard reasoning.
4. **Don't trust auto-compact mid-lane**; checkpoint to the plan file and prefer a written handoff + fresh session over a blind `/compact`, especially after debugging.
5. **Consider a light `SessionStart`/`UserPromptSubmit` hook** that echoes the current authority pointers (Drive chain + `AGENTS.md` + assignment board) so a fresh session is grounded deterministically. Hooks are compatible with the no-cron policy (they're event-driven, not scheduled). Keep it tiny.
6. **Keep `AGENTS.md` short and high-signal** (it already is); push must-happen-every-time steps (e.g. `agent:preflight`, art-validate) toward hooks rather than longer prose — matching the project's own "don't fix process by enlarging prompts" rule.
7. **Reaffirm the two recurring failure modes seen in the ledger**: (a) reading a **stale local `main`** (Packet 14 read `main` pinned pre-#53 → version confusion) — always `git fetch` and compare to `origin/main` (preflight covers this; keep enforcing); (b) **two writers on one branch** (PR #60) — one-writer rule holds; keep routing through the assignment board.

### Banked (needs owner/infra judgment)

- Some sessions hit **HTTP 403 on GitHub review/merge writes** (Packet 12/13 ledger). The current `gh` token has `repo`+`workflow` scope and read/fetch works; if programmatic approve/merge is wanted, confirm branch-protection settings and token scopes. (Merging is out of scope for this run regardless.)

---

## 6. Proposed root `CLAUDE.md` (implemented on this branch as a proposal)

A minimal bridge — not a second authority, just the pointer that guarantees grounding. Full text is at `docs/overnight-audit/CLAUDE.md.proposed` in this branch; the owner can move it to repo root when ready. It imports `AGENTS.md`, names the Drive read-order, and links this audit's action board — nothing more, to honor the "keep it short" rule.

---

## 7. What I did NOT change

- No existing authority document was edited or deleted. `AGENTS.md`, the Drive chain, the decision log, and all system docs are untouched.
- No hook, setting, skill, or memory file was installed or modified (recommendations only).
- The root `CLAUDE.md` bridge is provided as a **proposal file** on this unmerged branch, not placed at repo root, so nothing about how existing sessions load context changes until the owner chooses.
