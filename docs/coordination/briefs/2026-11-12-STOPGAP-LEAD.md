# Stopgap lead (other account, Nov 12, 2026)

Your one job: replace every kept stand-in with the real thing, so the player sees the world work instead of a fixed number.

## Start from a true list

- First check whether the lander's combined triage PR merged (search #7365 for `Stopgap lander:`). If it has, `node scripts/stopgaps-report.mjs` on main is your list. If not, read the 20 open "Stand-in triage" PRs (#8286 to #8319) for the kept rows, and don't merge them.
- Triage pages: `docs/stopgaps/triage-2026-11-10/`. Each kept row names what the player sees. Work only kept rows. Dropped rows are closed (owner, Nov 10: "way, way, way too in depth... work is being wasted").
- Many kept rows already have a pool item. Claim them by the pool rules in `docs/pool/START-A-BUILDER.md`.

## For each kept row, in this order

1. Check the code. Never trust a row's own text. If the replacement already runs, mark it resolved.
2. Build the real behavior inside the engine that already owns the mechanic. Money moves only through the existing accounts, treasuries and benefit payer (owner, Nov 10).
3. Where the gap is a number, use a sourced figure. Real data calibrates and is never a target.
4. Delete the register row and its code marker the same day it is replaced.
5. Skip rows that wait on the crime system or the Oct 10 scope calls (courts after early access; press, constituent cases and corruption stay basic). Collect owner calls as `Q: ... | Options: ... | Recommended: ...` lines on #7365.

## Rules

- Read AGENTS.md and `docs/pool/START-A-BUILDER.md` first, and follow them.
- A played year stays under two minutes. Nothing you add may slow the game.
- One PR per row or small family, each with a release declaration and the gate line.
- Never merge. The mergers on the main account gate every PR.
- Use the top model for judgment and Sonnet helpers for scoped builds.
- Post progress on #7365 as `Stopgap lead:` lines, each saying in plain words what the player now sees. Start a Monitor on #7365 first.
