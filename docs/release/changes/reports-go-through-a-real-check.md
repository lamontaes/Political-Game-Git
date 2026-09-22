---
id: reports-go-through-a-real-check
impact: none
---

Development tooling only; nothing a player sees changes.

A playtest report is now measured when it is written. A new `civic-reports`
skill sets the standard: the story first, then the why and the numbers, in
American English. A checker (`npm run report:check`) and a repository hook
run it automatically on owner-facing markdown and on Drive uploads, and a
read-only reviewer agent reads each report for sense before it goes out.
