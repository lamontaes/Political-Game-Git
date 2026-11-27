# Story split evidence, Nov 27, 2026 (not for merging)

This branch is the trial merge of the split's six branches on train/nov27-a (#10706, #10707, #10721, #10724, #10735, #10745), with the one conflict, `tests/guards/english/line-register-baseline.json`, resolved by taking each bank's lower count. It carries the proof that ran on that head, and nothing here should be merged: merge the pull requests.

- `packet-before-clean-train.md` and `packet-after-merged-head.md`: `SEEDS=pk1,pk2,pk3 node --import tsx scripts/words/first-evening-packet.ts` on clean train/nov27-a and on this head (Mesa del Caballo, Arizona; Hickam Housing, Hawaii; Greenville, New Hampshire). Played, not judged. Neither file has an unfilled slot, `undefined`, `[object` or a raw person id.
- On this head: `npm run typecheck` clean; golden path "no accepted regression" (23 accepted specs pass); records digest, place 4841542, seed s9proof, two years: 0 of 625 tables differ against train.
- Not done: a pre-grade by a session that did not port the words, and the sameness gate passing on Story's banks.
