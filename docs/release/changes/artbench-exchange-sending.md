---
id: artbench-exchange-sending
impact: none
---

Add `docs/systems/artbench-exchange-sending.md`, the sender-side contract for
putting a batch into the Art Bench exchange: write `manifest.json` last or drop
a `COMPLETE` marker, assemble a batch outside `01_INBOX` and move the finished
folder in atomically when sending from a cloud session, verify every PNG chunk
CRC and the inflated IDAT length before sending, and re-send under a new
`batchId` because a rejected item is recorded permanently. Documentation only;
no runtime code, product semantics, artwork promotion or test assertion
changes.
