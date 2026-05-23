export type HistoryHrefOptions = {
  category?: string | null;
  creator?: string | null;
  creatorMid?: number | string | null;
  from?: string | null;
  q?: string | null;
  to?: string | null;
};

export function buildHistoryHref(options: HistoryHrefOptions) {
  const params = new URLSearchParams();

  setParam(params, "from", options.from);
  setParam(params, "to", options.to);
  setParam(params, "category", options.category);
  setParam(params, "creator", options.creator);
  setParam(params, "creatorMid", options.creatorMid);
  setParam(params, "q", options.q);

  const query = params.toString();
  return query ? `/history?${query}` : "/history";
}

function setParam(params: URLSearchParams, key: string, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return;
  }

  params.set(key, String(value));
}
