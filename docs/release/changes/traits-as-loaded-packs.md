---
id: traits-as-loaded-packs
impact: none
---

Internal groundwork. A trait becomes a validated row in a pack rather than a
branch in decision code, and the content check that rejected any unrecognized
trait now asks whether a definition matches the pack that owns it. The packs
themselves are still compiled into the build and there is no route for a mod
to add one; that plumbing is named in
`docs/handoffs/people-and-life-2026-09-22.md` section 0b. No trait changed, no
save is touched, and nothing a player can see behaves differently yet.
