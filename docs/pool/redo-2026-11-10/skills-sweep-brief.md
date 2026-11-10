# The skills sweep of Nov 10, 2026 (the brief each helper gets)

Owner, Nov 10: "have fable update/delete/create skills too so that way i can make sure everything is ready for this final sprint." Every skill must be true today and readable by any agent on any tool (Claude, Codex, Muse or another) as plain markdown reached from `AGENTS.md`.

You are given a list of skills. For each one, read `.agents/skills/<name>/SKILL.md` whole, check it against the list below, fix what is out of date, and report. You change only the skills on your list.

## What is true today

Read these before the first skill: `AGENTS.md`, `.agents/rules/pool-item-standard.md`, `.agents/rules/how-we-talk.md`, `docs/pool/README.md`, and the newest twenty entries of `docs/coordination/OWNER-DECISIONS.md`. Where a skill disagrees with them, they win. The points that most often make a skill stale:

1. **The item standard (owner, Nov 10).** Every pool item carries `standard: 2`, a Cause that begins `Found in code:`, `Measured:`, `Design:` or `Needs cause.`, a Fix, a time box, a model and an effort. An item that says `Needs cause.` is never built. An item is built from the item alone.
2. **Checked items only.** A builder takes only items that carry `checked: fable` in their header.
3. **The builder's loop is one page.** `docs/pool/START-A-BUILDER.md` is how any agent takes work: `npm run pool -- next --model <level>` picks the next item in the written order (`docs/pool/order.json`), claims it and opens the item's own draft pull request. A skill that describes picking or claiming work points there and does not repeat it. (The page and the command land with pull requests opened on Nov 10; write the skill for them.)
4. **The pull request is the item's thread.** Progress, questions, send-backs and the handoff note go on the item's pull request, so a new agent on any tool can carry on. Issue 7365 is for crew-wide lines only.
5. **Rules, checks and skills merge first (owner, Nov 10).**
6. **Words are split by role (owner, Nov 10).** Only the Story session writes, changes or deletes lines under `data/english/parts/`. A builder lists the lines it needs. Every note the owner gives becomes a rule in `data/english/line-rules.json` that a program tests (`npm run words:rules`), a failing line is pulled (`data/english/pulled.json`), and a rule a program cannot judge is judged once by a reviewer and saved (`data/english/judged/`).
7. **Done means seen (owner, Nov 3).** A merge makes an item `merged`. Only a second session that did not build it, seeing it in the running game on main in a place and seed nobody chose, makes it `done` (`npm run pool -- seen`).
8. **Builders build; checkers check (owner, Oct 29).** A builder runs only the tests it wrote or changed. A checker runs the gate.
9. **The country tier and the fast clock.** Every state is people and firms kept as counts with a treasury, stepped monthly (`docs/design/country-tier.md`), and time can skip with results first. A skill that says the world outside the town is tables or equations, or that every day is played in full, is out of date.
10. **The life record.** Each person keeps one short list of what they went through (`docs/design/life-record.md`, `src/core2/person-life.ts`). A skill that tells a screen or scene to build its own history is out of date.
11. **The old core is gone (Oct 28).** Any path under `src/simulation` is stale.
12. **Sessions may message each other (owner, Oct 29).** A line that says they never do is stale. A message never replaces the record.

## What to fix in each skill

- **Anything that contradicts the list above** or a newer ruling. Fix it and cite the ruling by date.
- **Stale facts:** a "current as of" line from October, crew counts or role names that `docs/coordination/CREW.md` no longer has, a file, command or function that no longer exists. Check every path and every `npm run` name the skill gives: `ls` the path, and look the script up in `package.json`. Fix it or remove the line.
- **Tool-only wording.** A skill must work for an agent that is not Claude. Where it names a Claude-only tool (Task, Agent, sub-agent, Monitor, SendMessage, a slash command), say what to do in plain words first ("give a helper this brief", "check again in ten minutes") and keep the tool's name only as an example.
- **Length.** Cut repetition of `AGENTS.md` and of other skills: point to them. Keep every lesson that names a date, a place or a number; those are what a skill is for. Do not shorten for its own sake.
- **Frontmatter.** `name` is the folder's name. `description` is 41 to 1,024 characters and says when to use the skill and when not.
- **Plain American English.**

## What you do not do

- **Do not delete, rename or create a skill.** If a skill is replaced by another, or by a rule in `AGENTS.md`, say so in your report with the reason and every file that names it (`grep -rn "<name>" AGENTS.md CLAUDE.md .agents .claude docs/pool/README.md docs/coordination scripts tests`). The lead deletes.
- **Do not change `AGENTS.md`, `CLAUDE.md` or any file outside your skills' folders**, except the mirror.
- **Do not make new policy.** A skill line records a ruling, a standing rule or a method that worked. If you are unsure whether a line is still right, leave it and list it under "unsure" in your report.

## The mirror and the checks

Every skill is mirrored byte for byte in `.claude/skills/<name>/SKILL.md`. After editing a skill, copy it over its mirror (`cp .agents/skills/<name>/SKILL.md .claude/skills/<name>/SKILL.md`). Then run prettier on both files and `npm run test:skill-ops`, which must pass. Add one release declaration for your whole branch, `docs/release/changes/<your branch's last path part>.md`, with only `id`, `impact: none` and one sentence.

## Your report

One line per skill, in this form, then the lists:

`<name>: updated | unchanged | propose delete` — what changed, in one sentence, with the ruling's date where one applies.

- **Proposed deletions:** the skill, what replaces it, and every file that names it.
- **Missing skills:** a method you saw described in two or more skills, or in `AGENTS.md`, that no skill holds.
- **Unsure:** lines you left alone and why.
- The result of `npm run test:skill-ops`, and your branch's last commit hash.
