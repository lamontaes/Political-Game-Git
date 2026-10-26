/**
 * Checks the Cooperative Election Study stance loadings against the game's
 * policy questions and prints them: every row names a question the campaigns
 * engine knows, its survey item and a 95 percent interval around each loading.
 * Run: node --import tsx scripts/research/check-stance-loadings.ts
 */
import loadings from "../../data/research/people/opening-stance-loadings.json" with { type: "json" };
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };

const known = new Set(
  Object.keys((axes as { axes: Record<string, unknown> }).axes).map((q) =>
    q.replace(/^us-policy-positions:/, ""),
  ),
);
const rows = Object.entries(loadings.questions);
for (const [question, row] of rows) {
  if (!known.has(question))
    throw new Error(`Loading for an unknown question: ${question}`);
  for (const [name, l] of Object.entries(row.loadings)) {
    if (!(l.low <= l.value && l.value <= l.high))
      throw new Error(`${question} ${name}: value outside its interval.`);
  }
  console.log(
    question.padEnd(70),
    row.item,
    Object.entries(row.loadings)
      .map(
        ([k, l]) =>
          `${k} ${l.value.toFixed(2)} [${l.low.toFixed(2)}, ${l.high.toFixed(2)}]`,
      )
      .join("  "),
  );
}
console.log(`${rows.length} of ${known.size} questions have a survey item.`);
