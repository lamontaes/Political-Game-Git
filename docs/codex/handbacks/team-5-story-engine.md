# Old scene choices are rejected before an action runs

The new adapter checks an offered choice against the current scene records. It rejects choices after the viewer, place, moment, hearing, option content, or snapshot changes. The existing meeting panel has not been connected yet. Its exact projection and callback hunks remain pending central release. This piece stays draft until that real caller is connected and checked.

## 1. Why-chain

A player choice must still exist when its action runs. Why? A render can precede another world update. Why does that matter? The update can change the people present, exact speech, hearing, or available action. Why cannot the old button authorize the action? Its records describe the previous snapshot. Why resolve again? The canonical readers establish what is available now. Terminal: record-backed display and validation, with no new simulated person decision.

The adapter in `src/presentation/story-scene-player-options.ts` returns fresh canonical options. It dispatches no writer. It adds no reason for someone to attend, speak, listen, or change their mind. Those decisions remain outside this piece.

## 2. Research

The contract source is Team 8's resolver at `c760455dd9d5d51fb6e58fbde7af70448e959d4d`. The existing panel uses `ordinaryMeetingEntry`, `projectOrdinaryMeetingScene`, and the existing action runner. These are repository mechanisms, not evidence of a real-world causal rate.

The resolver's recorded-arrival branch establishes the viewer alone and returns no entry option. The integration must retain the existing entry reader and revalidate it inside its runner. No new entry option, actor roster, legal authority, or inferred attendance is authorized here.

## 3. Revisions

Offers copy their request and canonical option. Validation checks the current request identity, resolves again, and compares the complete option record. The comparison includes exact words, intent, listeners, hearing, evidence, and snapshot. Any changed snapshot requires another render offer, even if the changed record is unrelated.

This conservative rule can reject a still-available action after an unrelated update. It cannot silently carry an old choice across that update. No new effects link, rate, multiplier, or researched range is introduced.

## 4. What gets built

1. New pure adapter and focused tests: built in `src/presentation/story-scene-player-options.ts` and `.test.ts`.
2. Existing meeting-panel projection and entry/speech callback integration: pending release of those exact hunks. No panel edit made.
3. Other conversation, opening, leave, stay, or time-command callers: outside this bounded piece. The adapter preserves the resolver's option union but does not mount those callers.

## 5. Simulated, records, world pieces, checks

SIMULATED: no new person decision. Existing simulation writers remain the action owners.

RECORDS: no append, replacement, saved offer, or new history type. Offers are temporary render data.

WORLD PIECES: Team 8's resolver is a dependency, still in its own draft pull request. The ordinary meeting panel and its canonical entry, speech, and action readers already exist. The consumer caller is not connected by this adapter-only change.

CHECKS: a current offer returns a fresh canonical option without changing the world. Another viewer, place, moment, hearing request, changed snapshot, edited evidence, or edited listener list rejects it. A dead viewer receives no options. Expected attendance alone grants no options in the resolver tests. No place or no available canonical choice leaves the option list empty. No new distant-person logic runs.

## 6. Proof run

Executed: 16 tests across the new adapter and Team 8 resolver passed in 30.30 seconds. The logged fixture uses seed `team8-story-resolver-part1` in Lexington-Fayette, Kentucky. Six adapter tests cover fresh validation, changed request identity, a real unrelated organization append, altered option content, a recorded death, and copied request data. Ten resolver tests cover recorded meetings, arrival without a roster, expectations, work, knowledge, hearing, stale moments, and deaths.

Strict TypeScript over both new files and their imports returned zero diagnostics. Scoped ESLint, Prettier, whitespace, and report checks are listed in the publication receipt. These are source and fixture checks. Browser interaction, saved-player follow-through, full suite, and an independent watched meeting callback were NOT RUN. The first adapter run failed on an invalid sequence fixture; a canonical organization writer replaced that fixture before the passing run.

## 7. Worked example

Measured fixture: the current household conversation offers a canonical choice. Validation returns that choice from a fresh resolver read. A real organization record appended elsewhere changes the snapshot; the old choice is rejected even though fresh choices remain available. A recorded death removes the viewer's choices.

A named player pressing an integrated meeting button was NOT RUN. No dollar amount or month-by-month money outcome exists in this display adapter. The next bounded step is central release of the exact existing meeting-panel hunks, followed by callback integration and changed-caller checks.

## Method and ownership

The branch starts at the exact Team 8 resolver head above. Team 5 owns only the two new adapter files and this handback/release declaration. No resolver, resolver test, renderer, PlayerGame, simulation, time writer, or central claims file changed.

Pending existing hunks: `src/player/OrdinaryMeetingPanel.tsx`, projection lines 41–51, entry callback lines 131–136, and speech callback lines 177–183 at the dependency checkout. Preserve JSX, actors, agenda, labels, remaining handlers, and existing canonical writers. Pull request 1197 contains school-facility traces; it is not this consumer implementation.
