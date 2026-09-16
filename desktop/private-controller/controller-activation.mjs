import {
  activatePendingBuild,
  restorePreviousBuild,
} from "./private-update.mjs";
import { compatibilityRefusal } from "./update-compatibility.mjs";

function verifiedPair(
  proof,
  current,
  candidate,
  actualCurrent,
  actualCandidate,
) {
  if (
    proof?.version !== 1 ||
    current?.sourceRevision !== actualCurrent?.revision ||
    candidate?.sourceRevision !== actualCandidate?.revision ||
    compatibilityRefusal(current, candidate)
  )
    return false;
  for (const [contract, identity] of [
    [current, actualCurrent],
    [candidate, actualCandidate],
  ]) {
    if (
      !identity ||
      identity.dirty !== false ||
      identity.profile !== "internal-art-review" ||
      identity.channel !== "internal" ||
      identity.distribution !== "direct" ||
      !/^[0-9a-f]{64}$/.test(identity.clientTreeSha256 ?? "")
    )
      return false;
    // Legacy bundles need the exact-source contract recorded during verified
    // staging, never a guessed semver/schema migration.
    if (
      identity.compatibility &&
      (identity.compatibility.sourceRevision !== identity.revision ||
        compatibilityRefusal(contract, identity.compatibility))
    )
      return false;
  }
  return true;
}

/** Fixed controller activation: no force-quit, save/profile write,
 * timeout-as-success or background activation. */
export async function switchVerifiedBuild(state, operation, io) {
  if (io.busy)
    return {
      ok: false,
      message: "Staging is still busy. Play remains available.",
    };
  const rollback = operation === "rollback";
  if (operation !== "finish" && !rollback)
    return { ok: false, message: "Unsupported activation action." };
  const target = rollback ? state?.previous : state?.pending;
  if (!state?.current || !target || (rollback && state.pending))
    return {
      ok: false,
      message: rollback
        ? "No unambiguous last-good rollback is available."
        : "No update is waiting.",
    };
  const current = io.inspect(state.current);
  const candidate = io.inspect(target);
  if (!candidate.ready)
    return { ok: false, message: `Activation refused: ${candidate.problem}` };
  const proof = rollback ? state.rollbackProof : state.compatibilityProof;
  const currentContract = proof?.current;
  const targetContract = rollback ? proof?.previous : proof?.pending;
  if (
    current.identity?.revision !== state.current.revision ||
    current.identity?.version !== state.current.version ||
    candidate.identity?.revision !== target.revision ||
    candidate.identity?.version !== target.version ||
    !verifiedPair(
      proof,
      currentContract,
      targetContract,
      current.identity,
      candidate.identity,
    ) ||
    (!rollback && !candidate.identity.compatibility)
  )
    return {
      ok: false,
      message:
        "Activation refused: no supported, source-bound save/interface compatibility proof. Both bundles are preserved.",
    };
  if (await io.isRunning(state.current.appPath))
    return {
      ok: false,
      message:
        "Close the running game normally first. Its existing durable-save guard remains in control; no force quit was attempted.",
    };
  const next = rollback
    ? restorePreviousBuild(state)
    : activatePendingBuild(state);
  await io.writeState(next);
  let problem;
  try {
    problem = await io.openPath(next.current.appPath);
  } catch (error) {
    problem = error instanceof Error ? error.message : String(error);
  }
  if (problem) {
    await io.writeState(state);
    return {
      ok: false,
      message: `The requested build could not open: ${problem}. The prior Play pointer was restored.`,
    };
  }
  return {
    ok: true,
    message: rollback
      ? "The verified last-good build is restored and opening. The rolled-back source is held; no saves were rewritten."
      : "The verified update is active and opening now.",
  };
}
