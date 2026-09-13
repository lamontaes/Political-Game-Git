/** Shared renderer contract: background work never disables a ready Play. */
export function controllerControls(state) {
  return {
    playDisabled: !state?.ready,
    updateDisabled: Boolean(state?.busy),
    chooseDisabled: Boolean(state?.busy),
    cancelHidden: !state?.busy,
    finishHidden: !state?.pending,
    finishDisabled: Boolean(state?.busy),
  };
}
