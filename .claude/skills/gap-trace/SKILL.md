---
name: gap-trace
description: >
  How to trace a problem seen in the game (a screen, a line, a Journal, a
  history or a list that shows wrong, thin or repeated records) to its cause,
  to an existing fix and to the owner's ruling, and how to hand the lead a
  decision-ready row for it: A, the code; B, GitHub and the pool; C, the
  rulings. Use when a builder, reviewer or the owner reports a gap in play and
  the question is what, where, why and who fixes it. Not for building the fix
  (session-start), for a red on main (red-main) or for a question that no
  reading has been done for (look-first).
---

# Gap trace

The owner, Nov 12, 2026: "A, look at the code, see what, where, and why it's occurring. B, look at GitHub, see if there's anything open or in the pool that will fix it. C, look at my rulings. See if you can automatically answer it, and maybe you can have like a Sonnet sub-agent or something fix it. And if you go through all those and you can't fix it yourself, then it comes to me... if you see something and you can trace it, it's fixable, or I've ruled on it, etc. You don't even need to ask the CTO about it. You can just start fixing it and just let them know what you found and how you're fixing it."

## The steps

**A. The code.** Find the reader that draws what was seen (the screen, card, talk or journal function), the record it reads, and the engine that writes that record. Name file and line for each. Say which of three it is: the record is **missing** (no engine writes it), **wrong** (written with the wrong value or too often), or **never read** (written, but the reader does not use it). If you cannot get there by reading, say exactly how far you got and name the one measurement that would settle it. Do not run the world to find out; read first.

**B. GitHub and the pool.** Search the open pull requests for the engine and function names and two words of what was seen: `gh api -X GET search/issues -f q='repo:lamontaes/Political-Game-Git is:pr is:open <terms>'`. Then `rg -i <terms> docs/pool/items`. Note the state of every match (open, claimed, in-pr, merged, done). A match gets evidence added to its Notes; never file a twin.

**C. The rulings.** Run the `look-first` search: `docs/coordination/OWNER-DECISIONS.md`, `DECISION-REGISTER.md`, `prior-rulings/`, `docs/play-first/LAW.md`, then `docs/` and the design file for the area. If a ruling or a standing rule in `AGENTS.md` answers how it should work, build that and cite it with its date. A ruling that the code does the opposite of is a defect, not a question.

## Then

- **Fixable and small:** fix it, or brief a Sonnet builder with the cause, the fix and its test, and tell the CTO what was found and how it is being fixed. No permission is needed.
- **Traced but needs a world run:** brief a builder on another machine through the CTO, with the cause and the one measurement.
- **Cause not found:** say how far you got and name the one run that settles it.
- **Only a design call about the player's own experience that no ruling answers** goes to the owner, in one sentence, ending with the reading line from `look-first`.

## What a gap sheet row holds

1. What was seen and where (quote the screen or the owner).
2. **A:** the cause by file and line (missing, wrong or never read), or how far you got and the one measurement.
3. **B:** the open pull request or pool item, with its state, or "none".
4. **C:** the ruling or standing rule, quoted with date, or "none found" with the reading line.
5. The fix in two sentences.
6. Size: a Sonnet hour, a Sonnet afternoon or an Opus day.
7. Whether the fix needs heavy runs.
8. The verdict: FIX NOW, BRIEF A BUILDER, NEEDS MEASURING (name the run) or OWNER (the question in one sentence).

Write the sheet in plain American English (`civic-reports`); mark each claim measured or inferred.
