---
id: research-writer-ends-a-record-cleanly
impact: none
---

Development tooling only, with no player-facing entry point. The research
question writer ended every filed record with a blank line, because the
canonical JSON helper already terminates its output and the writer added a
second newline on top of it. The record read the same either way; the
repository format job did not, so a lane that filed a question failed a gate on
a branch whose actual change was elsewhere. Nothing in the game changes.
