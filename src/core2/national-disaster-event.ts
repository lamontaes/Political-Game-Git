// The kind of the record a national disaster leaves (modules/national-events.ts
// writes it). A leaf module with no imports: outside-budgets names it in its
// module definition at import time, so it must exist before either loads,
// whichever file is entered first.
export const NATIONAL_DISASTER = "national.disaster";
