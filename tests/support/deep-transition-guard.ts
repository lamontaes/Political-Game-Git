import { setDeepTransitionInputGuard } from "../../src/simulation/future-transitions";

// Tests keep the full proof that no scheduled handler mutates its input.
setDeepTransitionInputGuard(true);
