/** Preserves MOVEMENT_SUCCESSION_SETTINGS.retiredLeaderKeepsLeading; the caller reads settings. */
export function retirementTriggersSuccession(
  retiredLeaderKeepsLeading: boolean,
): boolean {
  return !retiredLeaderKeepsLeading;
}
