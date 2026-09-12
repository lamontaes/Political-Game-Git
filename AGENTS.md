# Our Civic Duty — repository guide

A political and government RPG with supporting life simulation. Deliver the requested player experience through the existing systems; do not expand routine jobs, school administration, or tooling because a substrate exists.

## Current assignment and evidence

The assigned Google Doc and the current Assignment Board own product scope and ownership. Live GitHub, source and executed checks establish implementation state. Historical reports are evidence at their named heads, not current tasks. Read the assigned task once, check the Board's current dispatch and relevant decision entries, and fetch the working refs. Resume from that state; reread only when a dependency, scope or owner changes. Do not traverse the whole ledger and every past handoff for each edit.

The Game Constitution and accepted decisions remain binding. Consult `docs/GAME-CONSTITUTION.md` and `docs/decisions/DECISION-LOG.md` for product/semantic choices; `ARCHITECTURE.md` and the relevant `docs/systems/` contract for a boundary change; release/deployment documentation for a publication change. Ordinary local repairs do not require another whole-project architecture audit. Contradictions are resolved explicitly, not by silently weakening a contract.

Full command and technical reference: `.agents/rules/repository-reference.md`. Its older universal reading/verification itinerary is superseded by this task-sensitive routing; its applicable substantive constraints remain in force. Use matching `.agents/skills/` only when the task triggers them.

## Implementation boundaries

- Keep simulation code pure TypeScript, independent of React, DOM and external APIs. Reuse canonical people, employment, enrollment, time, actions, money, knowledge, history and art systems.
- Preserve IDs, seeded identity, old saves, source evidence and append-oriented history. Unknown facts are not zero or permission. Read-only screens spend no game time and do not create facts.
- A scoped fictional event may be authored through existing simulation writers, then rendered from its recorded context. A prose-only renderer must not invent facts absent from its packet. Do not replace a missing producer with vague text or pretend a proposed action already happened.
- Use actual jurisdiction/location records. Kentucky/Lexington is an explicit scenario, not a universal normal-start default. Do not overwrite newer sourced behavior with an old placeholder assumption.
- Preserve asset originals, hashes, views and source-to-derivative lineage. Check the correct existing source bank before asking for replacement art. No raster enlargement, fabricated measurement, automatic art approval, or side-view deletion to satisfy a front-view consumer. Candidate preview and approved production remain distinguishable, with isolated saves.
- A room is first-person. Render actual present NPCs; do not manufacture relatives or add a second visible player merely to fill it.
- No proprietary material from other games. Version numbers and patch notes remain owned by the release machinery, not hand-edited branch bumps.

## Ownership and execution

Use preflight and identify workspace, branch, local/upstream head before substantial work. Keep one writer per overlapping surface and use isolated worktrees. Do not stash, reset, clean, force-push or overwrite someone else's work. Protect the owner's play folder, saves and port. Recheck upstream immediately before publishing.

Safe local implementation, fixture tests and repairs caused by the task do not require permission at every step. Continue through the running route, observed defects and handoff the task requests, rather than stop after the first component or report. Escalate only a material product/authority decision, missing permission, destructive action or paid external operation. LAND retains merge authority; do not self-approve consequential code.

A helper needs an independently useful bounded output and explicit path/tool ownership; no recursive delegation or duplicate full-repo review. Preserve configured concurrency limits. Model effort is proportional to the actual task, not permanently maximum.

## Validation and delivery

Use relevant format/lint/type checks, the actual release declaration range, focused behavior/regression tests and the affected integration path. Run the full gate when required by repository protections or by the final composition; don't repeat unaffected full suites after every tiny edit. Art changes run the applicable art gates; a prose or menu typo does not by itself require all art regeneration. No removed assertions, fake baselines, false passes or blanket timeout/exclusion workarounds.

UI changes need the real interaction and viewport being changed. Prose needs the actual assembled output and saved follow-through, not only row counts. Passing code tests is not human visual approval. Keep captures outside tracked evidence unless performing its explicit refresh workflow.

Publish cohesive ready fixes promptly. Minor safe polish is a follow-up, not a hold on unrelated useful work. Preserve unsafe paths behind their proper boundary until fixed. Report the exact published head/build route, what changed for the player, tests executed and specific remaining gaps. A PR, a merge into a feature branch, the build the owner plays, art approval and public release are different states.
