---
id: history-field-group-snapshots
impact: none
---

Grouped history reads keep previously returned groups unchanged when a later
writer appends records. The existing append-aware index copies each affected
group once per append batch, preserving source order, held prefixes and sibling
histories. This internal reader repair changes no saved records or simulation
outcomes. Prefix adoption uses its existing append-line proof before reading
records from a transaction view and rejects unavailable cached indexes before
reading their prefixes. Rewritten prefixes still receive the original record
identity checks. Append views read their base stream's original logical prefix
directly, while commit still releases the prior chunks and preserves each held
view's length and branch.
