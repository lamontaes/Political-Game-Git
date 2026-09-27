---
id: pre-start-date-receiver
impact: patch
section: Fixed
title: Keep the prior-world-year choice in New Game replay
---

Choosing the prior world year now carries the versioned fictional history
dates through Begin. The replay address keeps both the prior-year choice and
its date version, so reopening that address follows the same route. Older
replay inputs without the date version keep their earlier dates.
