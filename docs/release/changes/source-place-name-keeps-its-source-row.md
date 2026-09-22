---
id: source-place-name-keeps-its-source-row
impact: none
---

`formalName` on a synthesized national place is a source-fidelity field, and a
change of mine had started appending the state to it, which broke the accepted
county corpus assertion on main. What a resident says is `displayName`'s job;
no player-facing surface reads `formalName`.
