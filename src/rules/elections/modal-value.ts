export function modalValue<T>(
  items: readonly {
    weight: number;
  }[],
  values: readonly T[],
): T {
  let best = 0;
  for (let index = 1; index < items.length; index += 1) {
    if (items[index]!.weight > items[best]!.weight) best = index;
  }
  // stopgapId: "elections.empty-modal-result"
  return values[best]!;
}
