# Scene web, the campaign: pass 2

A played year in Bay, Arkansas fired one of the campaign's eight scene rows: the filing scene, eight times. Every row has an episode packet and at least three lines for each speaker, so the other seven wait on what the year brings, not on words.

## Rows that did not fire in this year, and what each waits on

| Type (trigger)                                  | Episode                                                              | Waits on                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `campaign-stop` (`speech.heard`)                | `quiet-weeks-listener-offers`, `the-local-candidate-debate`          | `scene-listener-offers-to-work` (done)                                                                                                 |
| `speech-afterward` (`speech.heard`)             | `the-local-candidate-debate`                                         | `words-speech-afterward-kin`, `words-speech-afterward-reply-moves-vote` (open)                                                         |
| `door-ask` (`campaign.door`, two rows)          | `the-first-door-of-the-day`                                          | No pool item names this row's producer: `golden-door-ask` is dropped. It needs one (lead director).                                    |
| `party-recruit` (`party-asked`)                 | `the-party-asks-you-to-run`                                          | No pool item names this row's producer. It needs one (lead director).                                                                  |
| `rally-opponent` (`campaign-message`, `debate`) | `a-primary-challenge-from-your-own-side`, `concession-call-received` | `words-debate-opponent-scene` (done), `director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-5-large-debate-field` (open) |

## Owner requests under Missing that belong to this domain

| Request                                              | Row or item                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Debate (OD:191)                                      | `rally-opponent` (debate), `words-debate-opponent-scene` (done)                                                                             |
| Debate answers as scenes (playtest 2026-10-24)       | `words-debate-answers-not-campaign-stops` (done)                                                                                            |
| Primary challenge (OD:185)                           | `filing` (episode `a-primary-challenge-from-your-own-side`), `scene-primary-challenge-told` (done), `words-primary-challenge-seed` (merged) |
| Signatures are a few played scenes (PR-elections:39) | No row and no scene item: `elections-petition-signatures` (done) is the engine's record only. It needs an item (lead director).             |

## Lines Story needs

None: every role of every campaign row has at least three lines.

## How this was run

Run of `npm run scene-web` by the builder in Bay, Arkansas (0504180), seed `8fe21c34d136a80cb4b0c0276d8cee1d6b1b4e36`. The domain has 8 rows. Every row names at least one episode packet in `docs/design/scenes/from-life/`, and every speaker role of every row has at least three lines (the fewest is the narrator of `campaign-stop`, 3, and `asked` of `door-ask` and `speech-afterward`, 10). Which rows fire depends on the drawn year.
