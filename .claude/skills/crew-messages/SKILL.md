---
name: crew-messages
description: >
  How Our Civic Duty's sessions message each other: the one tool that reaches
  another session, who gets which message (builder to checker, checker to
  merger, a red to red main, a question for the owner to the CTO, a seam to the
  session that owns it), what every message carries, what must also go into the
  record, and the rule that a process is written as a skill, never explained in
  a message. Use before sending any message to another session and whenever you
  are about to explain how to do something. Not for the shared files themselves
  (.agents/rules/how-we-talk.md) or for reports to the owner (civic-reports).
---

# Crew messages

The owner's rules: sessions message the CTO and the CTO messages them, sessions whose work meets message each other directly, and the CTO's word is the owner's word (owner, Oct 29; `.agents/rules/how-we-talk.md`). A message never replaces the record. **A process is a skill, not a message** (owner, Nov 1: "i saw one messaging about communicating a process. just make it a skill").

## The tool

- Send with the claude-code-remote `send_message` tool and the session id from `docs/coordination/CREW.md`. `SendMessage` is a different transport and reaches no other session (Oct 30: a checker's hand-offs to the mergers went through it for hours and arrived nowhere).
- Start with who is talking to whom: `Checker 2 → Merger 1.` Then the point in the first sentence.
- Arm no timers: no `send_later`, `create_trigger` or wake-up chain (owner, Nov 1: "Anthropic has removed 5-hour limits, so no need for any timers or anything"). After a long stop, the CTO restarts each session by message.

## Who gets what

| You have                                          | Send it to                                                       | And put it in                                       |
| ------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| A PR ready (builder)                              | the checker whose number is the PR number mod 5                  | the PR body                                         |
| A passed gate (checker)                           | the merger by the PR's parity (Merger 0 even, Merger 1 odd)      | a PR comment with the head SHA                      |
| A send-back (checker or merger)                   | the builder named in CREW                                        | a PR comment saying what fails, with place and seed |
| A red on main                                     | red main, or the session that owns the engine (`red-main` skill) | a pool item if none matches                         |
| A skills PR                                       | the CTO, who reads it and merges it at once                      | the PR body                                         |
| A question for the owner                          | the CTO, ending with the reading line (`look-first`)             | the PR body under OWNER DECISIONS NEEDED            |
| A seam (you will build in another session's area) | that session, before you build                                   | your channel block                                  |
| Your queue is empty or too long (checker)         | the CTO, who moves PRs between checkers                          | nothing else                                        |
| A stray push, a deleted file, a mistake           | the CTO at once, with what and where                             | nothing else                                        |

When the CTO moves a PR between two checkers, it tells both. A checker already mid-gate keeps the PR and tells the other.

## What a message carries

- The PR number and the head SHA it is about, the place and seed of any failure, and the exact ask.
- What you did and what is left, in one or two sentences. Not the whole log: that goes in the PR comment.
- A ruling you relay names where it is recorded (`OWNER-DECISIONS.md`, with its date and time).

## A process is a skill

- If you are about to explain in a message how to do something (a command, an order of steps, a trap to avoid), write it into the skill that covers it, or a new skill, and send the skill's name and line instead. Ship it as a `skills:` PR the CTO merges at once (AGENTS.md, "Skills").
- If you receive a process in a message, check that a skill holds it. If none does, add it.
- A message that settles something for the future (a route, a ruling, a recurring fix) is also a skill line or an `OWNER-DECISIONS.md` entry, never only a message.

## When messages cross

- Two messages about the same thing can cross. The newest from the CTO wins. Reply with what changed and the head you are on.
- If a message tells you something that is already done or already wrong, say so in one line and carry on. Do not redo the work.

## Stop condition

Done when each message reached its session by `send_message`, carried the PR, head, place and seed it was about, matched a record entry, and any process it explained is now a skill line.
