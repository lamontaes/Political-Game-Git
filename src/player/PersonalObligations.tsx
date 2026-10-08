import { moneyText } from "../simulation/money-text";
import {
  projectPersonalObligations,
  type DebtLine,
  type MoneyFlowLine,
  type PermissionLine,
} from "../presentation/personal-obligations";
import { proseDate } from "../presentation/prose-dates";
import type { EntityId, World } from "../simulation";

/**
 * Money and property → what the person is paid, pays and owes, and what a law
 * lets them do. Every value is a record value; there is no helper sentence
 * (`personal-obligations.ts`). Reading it spends no time and changes nothing.
 */
function FlowRows({
  lines,
  testid,
}: {
  readonly lines: readonly MoneyFlowLine[];
  readonly testid: string;
}) {
  if (lines.length === 0) return null;
  return (
    <ul className="pg-purses" data-testid={testid}>
      {lines.map((line) => (
        <li key={line.flowId} data-flow-kind={line.kind}>
          {line.counterparty ? <strong>{line.counterparty}</strong> : null}
          <span>{line.kind}</span>
          <span>{moneyText(line.amount)}</span>
          <span>{line.cadence}</span>
          {line.last ? (
            <>
              <span data-payment-status={line.last.status}>
                {line.last.status}
              </span>
              <span>{moneyText(line.last.moved)}</span>
              <time dateTime={line.last.on}>{proseDate(line.last.on)}</time>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function DebtRows({ lines }: { readonly lines: readonly DebtLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="pg-purses" data-testid="personal-debts">
      {lines.map((line) => (
        <li key={line.obligationId} data-debt-kind={line.kind}>
          {line.lender ? <strong>{line.lender}</strong> : null}
          <span>{line.kind}</span>
          {line.balance ? <span>{moneyText(line.balance)}</span> : null}
          {line.monthlyPayment ? (
            <span>{moneyText(line.monthlyPayment)}</span>
          ) : null}
          <span>{`${line.annualRatePercent}%`}</span>
          <span data-debt-standing={line.standing}>{line.standing}</span>
        </li>
      ))}
    </ul>
  );
}

function PermissionRows({
  lines,
}: {
  readonly lines: readonly PermissionLine[];
}) {
  if (lines.length === 0) return null;
  return (
    <ul className="pg-purses" data-testid="personal-permissions">
      {lines.map((line) => (
        <li key={line.recordId} data-permission-status={line.status}>
          <strong>{line.name}</strong>
          <span>{line.status}</span>
          <time dateTime={line.since}>{proseDate(line.since)}</time>
        </li>
      ))}
    </ul>
  );
}

export function PersonalObligations({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const obligations = projectPersonalObligations(world, personId);
  if (
    !obligations ||
    obligations.income.length +
      obligations.bills.length +
      obligations.debts.length +
      obligations.permissions.length ===
      0
  )
    return null;
  return (
    <section className="pg-personal-section" data-testid="personal-obligations">
      <FlowRows lines={obligations.income} testid="personal-income" />
      <FlowRows lines={obligations.bills} testid="personal-bills" />
      <DebtRows lines={obligations.debts} />
      <PermissionRows lines={obligations.permissions} />
    </section>
  );
}
