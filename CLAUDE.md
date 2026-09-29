# Our Civic Duty — Claude Code bridge

@AGENTS.md

## Standing owner rules

Owner's standing rules, binding on every session regardless of trigger. Detail and
self-checks are in the matching `.claude/skills/<name>/SKILL.md`.

- **No dice.** No seeded roll or fixed percentage decides what a person, business,
  official or body does; the actor's traits, principles, relationships, money,
  health, the law in force and the place's conditions decide. Real rates check
  totals, they never pick one actor's outcome. See `no-dice` — a rolled outcome
  erases the player agency the game exists to reward.
- **One rule, all 56 places.** Never name a state, city or GEOID in logic; place
  facts live in data, and watched runs and tests draw a random place from all 56
  (50 states, D.C., Puerto Rico, Guam, USVI, American Samoa, Northern Marianas),
  naming place and seed. See `one-rule-all-places` — a fix proven in one place
  only is a demo, not a fix.
- **Estimate, never UNKNOWN.** An unread value a player can see starts from the
  real average with a per-world spread, marked ESTIMATED FROM AVERAGE with
  source; exact values are for things players actually recognize; finish simple
  research instead of estimating around it. See `estimate-not-unknown` — a
  visible gap breaks the world worse than a marked estimate does.
- **Wire to the world.** Every new law or feature moves money, people or places
  in the same PR, proven by a watched-world test; a bill carries its own terms
  written from its sponsor's views, and a rule applies to its whole module, not
  just the named example. Fix a known bug with a fast fix instead of only
  reporting it. See `wire-to-the-world` — scaffolding nobody can see happen
  isn't delivered.
- **Emergence, reported.** Every hand-back opens `MERGED`, then `WHAT EMERGED`
  with each outcome marked `DECIDED` (quote the recorded reason) or `HARDWIRED`
  (file:line), then wider knock-on effects and missing links, then
  `VITAL STATISTICS`. Report only what the simulation actually traced. See
  `emergence-report` — the owner tracks the game by what it produced, not intent.
- **Local gate, not the full suite.** Validate typecheck/eslint/prettier on
  changed files, `release:check --mode pr`, and the tests for changed files
  (browser specs only if screens changed); a failure that's also red on a clean
  `main` doesn't block. Never force-push, never a permanent delete. See
  `local-gate` — a light gate that runs beats a heavy one everyone skips.
- **Research before building.** Look up real examples of whatever the feature
  touches across the country; real data checks the simulation and never decides
  an outcome by itself, and player screens never show sources. See
  `research-habit`.
- **Scenes are places, not backdrops.** A scene is a background shaped by the
  world's current state, narration that reads that state, anchors, and the real
  people actually there, posed and clickable; places are multi-use by default.
  See `scenes`.
- **Lowest model/effort that works.** Sonnet Medium for agreed designs, Opus
  Medium (not High) for judgment calls; escalate only after the lower tier
  actually fails. See `model-effort`.

Full task instructions live in the assigned Google Doc. Check its current revision, the Board's active dispatch and the relevant decision entries; then inspect live code. Use the canonical index/read-write protocol to locate missing authority, not as a compulsory tour through all historical documents before every edit.

Resume the existing owner where applicable, in that owner's registered workspace (`npm run storage -- workspace --owner <owner>`); do not clone or add a worktree for a retry, a new chat or a new branch. An old PR description or active GitHub Actions run is not proof of the current code or a running coding session. Preserve the active LAND/UI boundaries.

Use a relevant skill when its trigger matches. `.agents/skills/civic-prose/` guides prose; it is a development-time authoring process, not permission to add model calls to shipped play. `.agents/skills/civic-reports/` governs every report, write-up and Drive document for the owner, pull request descriptions included: story first for a playtest or life, then the why and the numbers, in American English. Run `npm run report:check -- <file>` and the `civic-report-reviewer` agent before sending one; the repository hook runs the check on owner-facing markdown writes and Drive uploads. Do not duplicate a renderer, save store, catalog or scheduler to bypass a missing connection.

Complete the requested working route and fix defects you expose in the owned scope. Give the user a usable publication/build before unrelated follow-on breadth. Report exact evidence without an additional narrative of every tool call.

Keep invariant tests and independent review of new consequential semantics. Skip ritual duplicate checks and whole-project rediscovery. Apply model-specific configuration only where supported; do not change credentials, subscriptions, spend or platform cache settings speculatively.
