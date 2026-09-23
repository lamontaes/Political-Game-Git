---
id: filing-says-whether-it-asked-anybody
impact: none
---

`research:request file` now says, in a block nobody can read past, whether the
record it just wrote is anywhere the people answering can see it. It names the
branch, whether that branch is on the remote, whether it has an open pull
request, and how far ahead of the default branch it is.

The queue's premise is that filing a record commissions the research. That
premise is false for a record on a branch that never merges: the published
document is built from whichever branch renders it, so the question reaches
nobody. Two sweeps an hour apart on 2026-09-22 found nine records stranded
that way across four branches, each written carefully by somebody who believed
they had asked a question.

It warns rather than refuses, because filing early on a branch whose pull
request is about to open is reasonable, and a tool that refuses there teaches
people to write the JSON by hand and lose the validator. The pull-request check
needs the network, so it is allowed to come back unknown — and unknown is
reported as unknown rather than as "there is none", since a warning that
overstates what it knows is one people learn to scroll past.

No player-facing behavior changes: this is the authoring queue.
