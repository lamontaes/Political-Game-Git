/** Shared renderer contract: background work never disables a ready Play. */
export function controllerControls(state) {
  return {
    playDisabled: !state?.ready || Boolean(state?.launchBusy),
    updateDisabled: Boolean(state?.busy),
    chooseDisabled: Boolean(state?.busy),
    cancelHidden: !state?.busy,
    finishHidden: !state?.pending,
    finishDisabled: Boolean(state?.busy) || Boolean(state?.launchBusy),
    rollbackHidden: !state?.previous || Boolean(state?.pending),
    rollbackDisabled: Boolean(state?.busy) || Boolean(state?.launchBusy),
  };
}
