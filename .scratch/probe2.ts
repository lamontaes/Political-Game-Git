import { DEFAULT_NEW_GAME_SETUP } from "../src/presentation/new-game";
import { questionnaireScreenFor, answerQuestionnaire } from "../src/presentation/setup-questionnaire-flow";
import { admissibleQuestionnaireBank, setupLifeContext } from "../src/simulation";

for (const age of [10, 15, 34]) {
  const ctx = setupLifeContext({ startAge: age, startingLife: "ordinary-life", household: "shares-a-home" });
  console.log(`\n===== start age ${age} (${ctx.band}) — admissible ${admissibleQuestionnaireBank(ctx).length} items`);
  let setup: any = { ...DEFAULT_NEW_GAME_SETUP, seed: "probe-72", startAge: age, questionnaire: "short", priors: [] };
  for (let i = 0; i < 6; i++) {
    const screen = questionnaireScreenFor(setup);
    if (!screen) { console.log("  (done)"); break; }
    console.log(`  Q${screen.ordinal} [${screen.questionKey}] ${screen.prompt.slice(0, 120)}`);
    for (const o of screen.options) console.log(`      - ${o.text}`);
    setup = answerQuestionnaire(setup, screen.questionKey, screen.options[0]!.key);
  }
}
