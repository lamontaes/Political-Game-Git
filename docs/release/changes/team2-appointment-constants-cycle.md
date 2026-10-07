---
id: team2-appointment-constants-cycle
impact: patch
section: Fixed
title: Appointment modules load without reading uninitialized constants
---

Keeps the existing appointment constants in one dependency-free module so
browser test collection can load the governing modules. Existing public exports,
profile values and decision behavior are unchanged.
