# ALIVE43 ROLE W → LAND and L — increment 3 (W3, first families)

READY FOR RECEIVING REVIEW — VALIDATION PENDING (full `npm run validate` and
e2e not run for W3; ordinary-browser proof is recorded separately when done).

|                  |                                                 |
| ---------------- | ----------------------------------------------- |
| Branch           | `claude/alive43-w-world-parties`                |
| Base             | main `003b45ff365a51665139203a1d4b663ba441c093` |
| W3 source commit | the commit before this file                     |
| Contract         | `alive43-world/v1` plus the W3 readers below    |

## What W3 does

Two event-based families, through registered future transitions composed into
`createCampaignElectionTransitionRegistry` (the registry `passOrdinaryDays`
always uses):

- Local public matter: the home area's actual local government posts a
  proposal on a generic facility or service subject and opens public comment.
  At each check: withdrawn, comment period extended, or no public update. A
  revised proposal is only available after a recorded
  `submitPublicComment` (the resident's intervention).
- International development: unnamed and bounded (no real foreign government,
  price or vote). At each check: persisted, eased, or no public update.
- A concluded matter schedules a successor 20–45 days later on a different
  subject. Places with no local government get no local matter.

Every stage is a public event published through `publishPublicEvent`. No
knowledge is written for anyone. Readers:

- `projectPublicMatters(world)`: current stage per matter, with
  `openForComment`.
- `projectMeaningfulChanges(world, personId, sinceSequence)`: refs with
  `visibility` (`public` | `known` | `public-and-known`), `importance`,
  `family`, `stage`, `matterId`, `subjectIds`, `status`, `publicationId`.
  "known" comes only from that person's knowledge records or direct
  participation.

The allegation/inquiry and state/national governing families are not in this
increment.

## Files

- New: `src/simulation/living-world/developments.ts`,
  `src/presentation/living-world-developments.test.ts`.
- Shared adapters: `opening-life.ts` (calls `ensureLivingWorldDevelopments`
  after W2), `campaigns.ts` (one more handler entry), living-world `index.ts`.

## Checks actually run

- `tsc --noEmit -p .`: exit 0. `eslint` on W2/W3 files: exit 0.
- W3 proof (Lexington-Fayette life): 7 passed, exit 0.
- Negative control: with every step forced to "no public update", 4 tests
  failed on missing changes; the file was restored byte-identical.
- Combined: W1, W2, W3 proofs, the batch adapter, opening-life,
  nationwide-opening, nationwide-local-governments, shell-projections,
  player-pure-surfaces, world39-editorial and all `dehardwire-*`: 208 passed,
  15 files, exit 0.
- Probe: 26 weekly `passOrdinaryDays(…, 7)` skips took 1,937 ms and recorded
  14 public development stages across 7 matters, with multi-week quiet gaps;
  save 1,519,588 bytes.

Pending for LAND on the union: `corpus:prose` regeneration and the
dehardwire census (the census test rewrites `docs/dehardwire/census.json`).

## Receiver action

LAND: receive the branch with L's mounts and regenerate the shared artifacts
before full validate.

## Addendum — browser journey and follow-up fix

Ordinary-browser journey on dev server identity `6e735fd5` (clean,
`/private/tmp/pg-alive43-w`, port 5481) at 1440x900, by pointer: New game →
Start a life → age 34 → Kentucky → Lexington → Discover through play → Begin
(Amir Zimmerman, January 5, 2026) → Week ×5 → February 9, 2026. No console
errors. The scene headline surface showed the latest W3 stage, and News
"Latest reporting" listed the local road-repair proposal and the international
development's reported, continued and eased stages. In this seed only the
international matter changed within five weeks; the local proposal had quiet
checks.

Defect found and fixed in the follow-up commit: News listed the House and Senate
under "Around Lexington". The chambers are now `sector:federal-legislature`
(ids unchanged), with a W1 regression test.

WORLD39 test adaptations (owner disclosure): `world39-readers.test.ts` assumed
zero publications at opening and a first-sorted publication. Both passed at W2
`7537cea5` and failed at W3; they now assert opening publications are recorded
developments and look a publication up by source. With the W1 and W3 proofs:
23 passed.

Observed, not W-owned: a dark vertical overlay across the living-room scene in
this public checkout (no private pack).

## Re-verification at the fix head

The dev server was restarted so `/__dev/identity` reported head `bb997acb`,
clean, before collecting proof. A fresh ordinary life by pointer at 1440x900
(Emily Clay, Lexington, January 5, 2026) → Week ×5 → February 9, 2026:

- News "Around Lexington, Kentucky" lists the Urban County Government and local
  schools only; the House and Senate no longer appear.
- "Latest reporting" shows both W3 matters changing within the month in this
  seed: the local proposal's comment period was extended (published
  January 16) and the international development eased (January 11).
- One console `net::ERR_CONNECTION_REFUSED` appeared in the original tab after
  the server restart. A newly opened tab loading the same build logged only
  Vite connect messages and no errors, so it was left over from the stopped
  server, not the app. The app source has no hard-coded local endpoints.

## Final full unit suite on `0277424d`

`vitest run`: 5402 passed, 6 failed, 29 skipped (434 files), exit 1.
Classification:

- `scripts/prose-corpus/corpus.test.ts` and `anchor-cli` ×3 /
  `anchor-crossbranch`: new W source files change the committed coverage
  artifacts; pending LAND `corpus:prose` regeneration (pass on main).
- `people-visual4-review` wardrobe plan timeout: also fails on main `003b45ff`.
- `narrative-life` "Play-proof 6" timeout: load only; the file passes alone on
  `0277424d` (35/35, exit 0).

The `dehardwire-census` test rewrote `docs/dehardwire/census.json` during the
run; it was restored and is not committed.
