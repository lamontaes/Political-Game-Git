# Model log

The owner wants model and effort choices judged on speed, cost and rework together (Oct 10, 2026): a setup that's noticeably faster and cheaper but needs a few more send-backs is fine. The CTO adds one row per finished package part, from the builder's hand-off and the finisher's review, and adjusts the defaults in `AGENTS.md` when the numbers show a better balance.

| Date | Package and part | Builder (model, effort) | Finisher (model, effort) | Time to hand-off | Usage, if visible | Send-backs (why) | Defects found later | Notes |
| ---- | ---------------- | ----------------------- | ------------------------ | ---------------- | ----------------- | ---------------- | ------------------- | ----- |

## Earlier evidence (before this log)

- **Codex Sol, max, long sessions (P8 core, Oct 8–10):** steady but slow on money accounting; very heavy evidence and checking; introduced a 3x slowdown and 3.2 GB of copied evidence; ran about 36 hours before usage ran out. Lesson: medium or high, one package per session, lighter process.
- **Claude Sonnet, high (P16 profile, Oct 10):** found the slowdown's cause in under an hour; its report needed seven review rounds before passing.
- **Claude Opus, high (P10 drives, P13 director, P15 people, Oct 9–10):** fast, careful work with few send-backs; the most expensive per hour.
