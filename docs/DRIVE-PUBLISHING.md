# Publishing to Drive

Every lane that publishes a document to Drive follows this. It is short because
it is one rule with one reason.

## The rule

**Never trash a document you are superseding. Rename it and move it.**

When a new render replaces an old one:

1. Create the new document in the live folder, with a stamped title:
   `<NAME> — <YYYY-MM-DD HHMMZ> — <branch> <short commit>`.
2. Rename the old one with a `SUPERSEDED — ` prefix, keeping the rest of its
   stamped title exactly as it was.
3. Move the old one to the sibling archive folder.

Renaming and moving preserve the document's ID, so every link and every comment
already pointing at it keeps resolving. Trashing destroys both.

## Why, stated as the property rather than the ritual

The pattern this replaces was "one folder holds exactly one current document",
maintained by binning the previous one. It was protecting a real property — _a
reader must never be unsure which render is current_ — and a stamped title
satisfies that property completely, without deleting anything.

That is the whole lesson, and it is worth more than the rule: **a rule stated at
the level of the artifact rather than the property it protects will eventually
forbid the right thing.** Ours forbade keeping the other side's replies.

Two things it cost before it was fixed, both on 2026-09-22:

- ChatGPT's 02:24:59 reply was a comment on a superseded render, and the render
  went to the bin with the comment on it. We cannot read Drive comments at all,
  so the channel read as silent while the other side was answering.
- A return published at 03:24 trashed the 02:50Z document, which is the exact
  one ALIVE44 names as its current checkpoint. The far end's pointer now
  resolves to nothing.

## A render is a copy, never the source

Write the source first, then upload it unchanged. Never write a sentence into
the upload that is not already in the source.

The source is whatever this project can read back and diff: a file in this
repository for anything generated from it — the research queue's
`OPEN-QUESTIONS.md` is the source and its Drive document is a copy — or, for a
document that has no repository home, a single file in the publishing session's
scratchpad that the upload is made from.

This connector cannot edit a document body, so every refresh uploads a whole new
document. That makes an in-flight edit invisible: it lands in Drive, never
reaches the source, and the next render silently drops it. The two copies
diverge within minutes and nothing reports it. It has already happened once, in
an audit whose own subject was a registry that nothing reads.

The rule is the same one this project applies to generated code: do not hand-edit
the output. If a sentence is worth publishing it is worth being in the source,
and if it is only in the render, it is already lost.

The property underneath it: **no text may exist only where the next render will
not look.** A document with no repository home satisfies that a second way —
read the live document back through the connector immediately before composing
the next one, and build the new render from what came back. That is not a
loophole for editing in flight; it is the same guarantee reached from the other
side, and it is the only workable shape when the published document is the only
copy. Where a repository source exists, it wins, and bypassing it is the failure
this section is about.

## A replacement that finds nothing must fail, not pass

This is not only about Drive: **any scripted edit to a committed document should
assert that it changed something.**

A string replacement that matches nothing is the quietest failure available. It
returns the text unchanged, writes the file, and exits zero. Nothing is logged,
because from the tool's point of view nothing went wrong. The document is simply
missing the edit, and the next reader has no way to tell it was ever attempted.

That is how three defect rows in an audit went unupdated for twenty minutes: the
formatter had padded the table cells to align them, the strings being replaced
no longer matched the padded cells, and every replacement silently matched
nothing. The edits made with an assertion in the same session caught their own
misses on the spot.

So write the assertion into the edit itself, not into a review afterwards:

```python
assert s.count(old) == 1
s = s.replace(old, new)
```

`count(old) == 1` rather than `>= 1`, because a pattern that matches twice is
also a mistake — it edits a place you were not looking at. With `sed`, check the
file actually changed, or use a form that errors on no match; a bare
`sed -i 's/…/…/'` over a file it does not match is the same silent pass.

It is the same shape as the owner's rule for content packs — ignore it and say
so — and as the scheduler finding in the audit that produced this document: **a
thing that does nothing must say so.** Silence is the one outcome that is always
wrong.

## A trash is a one-way door, and recreating the document is not the repair

This connector has `trash_file` and no untrash. Once a document is trashed,
`get_file_metadata` returns not found and `update_file` returns permission
denied, so no session can restore it, rename it or move it. Only the owner can,
from the Drive browser, within thirty days.

His restore brings back the **original id**, and the id is what every link and
every comment was attached to. So creating a replacement document does not fix
a broken pointer: it makes a new id and repairs nothing, while making the folder
look as though it had been handled. When a trash has already happened, the only
real fix is one line in the owner's list asking him to restore that document.

It follows that the archive folder is for documents we still have. Do not
recreate a trashed render under a `SUPERSEDED — ` title; that puts something in
the folder that looks like this convention while fixing nothing.

## This is not an exception to PERMANENT REMOVAL

PERMANENT REMOVAL is about unused assets, obsolete code, packed copies and stale
instructions in this repository. A document another party is citing is not
unused — it is a live dependency, and that rule's own clause covers this case:
connect the replacement before deleting what something depends on.

**A document anyone outside this project has cited must never be trashed, even
when superseded.** Archive it and leave the citation working.

## Where the folders are

Ask the coordinator for the current live and archive folder IDs rather than
copying them here; they are Drive state, not repository state, and a stale ID
in a checked-in file is how a lane publishes into the wrong place.
