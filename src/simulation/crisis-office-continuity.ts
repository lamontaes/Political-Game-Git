// Compatibility for the independently pinned clock proof. Production clock
// movement uses the single office lifecycle in governing/office-continuity.
export { applyRecordedOfficeContinuity as applyCrisisOfficeContinuity } from "./governing/office-continuity";
