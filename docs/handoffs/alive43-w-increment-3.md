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
