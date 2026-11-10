---
id: pool-next-with-no-blanks
title: "The pool command has no blanks: an agent names itself and finds its own tier"
area: docs
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/fable-pool-no-blanks
pr: 8242
after:
blocked-on:
lead: fable
model: fable
effort: medium
root: none
source: owner, Nov 10, 2026, through the CTO
checked: fable 2026-11-10
---

**What.** The owner pastes one command to start a builder on any tool. The first version made him fill in a level and a name. He said: "No, that's too much work for me. Again, I might not be using Claude for these. That's why I say they're not all going to be Opus, Sonnet, or Haiku. And I'm not choosing the name." The command must be one fixed block, and the levels must not be Claude's model names alone.

**Cause.** Found in code: `next` in scripts/pool/index.ts required `--model` with one of the order's four Claude names and took the agent's name from `--agent`, and the page docs/pool/START-A-BUILDER.md told the owner to fill both in. A Claude cloud session's branch prefix was typed by hand with `--branch-prefix`.

**Fix.** An agent says what it is once, `npm run pool -- check-in --as "<its model and tool>"`. The tool finds its tier (light, mid, top, lead) in a new table, docs/pool/tiers.json, matching whole words and falling back to mid, gives it a unique name, and keeps both in the checkout's git folder. `next` with nothing typed reads that, or checks the agent in as mid. The agent's first claim adds one file about it under docs/pool/agents/. The branch prefix is read from the environment. `--tier`, `--model` and `--agent` stay for the owner and the CTO. The page, the README and AGENTS.md carry the new paste.

**Time box.** 3 hours for the lead. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Keep it simple: one table and one small file per agent, with no new service or thread. Look before you ask: the owner's words are quoted in the page. Builders build; checkers check: the tool's own tests run here, the gate runs at the desk.

**Done when.** A second session, on main, pastes the command from docs/pool/START-A-BUILDER.md into a fresh checkout as it is, checks in with its own words, and sees a name and a tier come back. It then runs `npm run pool -- next` once for real and sees an item of its own tier claimed, its branch and draft pull request made, and its file under docs/pool/agents/ on main. The test in scripts/pool/next.test.ts passes. This is a tool, so there is no drawn place to play; the check is the real run above.

**Waits on.** Nothing.

**Files.** scripts/pool/agent.ts (new), scripts/pool/index.ts, scripts/pool/next.test.ts, docs/pool/tiers.json (new), docs/pool/START-A-BUILDER.md, docs/pool/README.md, AGENTS.md
