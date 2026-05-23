export function resolveChartDatum<T extends { label?: string; name?: string }>(
  event: unknown,
  data: T[],
) {
  const payload = event as {
    activeIndex?: number | string;
    activeLabel?: number | string;
    activePayload?: Array<{ payload?: T }>;
    activeTooltipIndex?: number | string;
    payload?: T;
  };

  if (payload.payload) {
    return payload.payload;
  }

  const activePayload = payload.activePayload?.[0]?.payload;
  if (activePayload) {
    return activePayload;
  }

  const index = normalizeIndex(payload.activeTooltipIndex ?? payload.activeIndex);
  if (index !== null && data[index]) {
    return data[index];
  }

  if (payload.activeLabel !== undefined) {
    const label = String(payload.activeLabel);
    return data.find((item) => item.label === label || item.name === label);
  }

  return undefined;
}

function normalizeIndex(value: number | string | undefined) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : null;
}
