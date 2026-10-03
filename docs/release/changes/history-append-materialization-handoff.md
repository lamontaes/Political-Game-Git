---
id: history-append-materialization-handoff
impact: none
---

History append transactions now hand their materialized arrays back to held
internal views, releasing the committed stream's prior links and copied chunks.
Each view retains its original logical prefix, including sibling branches and
nested transactions. Saved records, ordering and readonly snapshot behavior are
unchanged. This internal retention repair does not establish an OOM resolution.
