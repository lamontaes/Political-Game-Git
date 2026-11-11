// The kind of the record a person who moves away leaves (modules/moves.ts writes
// it). A leaf module with no imports: the engines that listen for it (offices,
// jobs) name it in their module definitions at import time, so it must exist
// before any of them loads, whichever file is entered first.
export const MOVED_AWAY_EVENT = "person.moved-away";
