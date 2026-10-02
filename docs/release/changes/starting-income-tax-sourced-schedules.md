---
id: starting-income-tax-sourced-schedules
impact: patch
section: Fixed
title: Load four more recorded opening income-tax schedules
---

Delaware, Missouri, North Dakota, and Oklahoma now carry the existing sourced 2026 single-filer brackets and standard deductions in their starting income-tax laws. The existing law-schedule loader and withholding calculator read these terms. Explicit zero-rate bands preserve untaxed income below the first positive bracket. Unread deductions, exemptions, credits, and territorial schedules remain unfilled rather than being presented as exact legal terms.

Massachusetts and New Jersey also carry their officially recorded base single-taxpayer personal exemptions through the existing taxable-income offset field, alongside the sourced 2026 brackets. These amounts are personal exemptions, not legal standard deductions; additional eligibility-based deductions and credits are outside these base schedules.

West Virginia carries the official 2026 single-filer rates, legally retroactive to January 1, and one recorded $2,000 taxpayer exemption. The starting schedule supersedes the older calibration rates without changing the retained source packet or tax runtime.
