import type { WatchHistoryRow } from "./types";

const videoBusinesses = new Set(["archive", "pgc"]);
export const LONG_VIDEO_SECONDS = 20 * 60;
export const COMPLETION_GRACE_SECONDS = 60;

export function normalizeHistoryRow(row: WatchHistoryRow): WatchHistoryRow {
  const bvid = row.bvid ?? rawString(row.raw, ["bvid"]) ?? rawString(row.raw, ["history", "bvid"]);
  const business = row.business ?? rawString(row.raw, ["history", "business"]);

  return {
    ...row,
    business,
    bvid,
    count_override: row.count_override ?? null,
    duration: normalizeNonNegative(row.duration ?? rawNumber(row.raw, ["duration"])),
    progress: normalizeProgress(row.progress ?? rawNumber(row.raw, ["progress"])),
    cover: normalizeExternalUrl(row.cover ?? rawString(row.raw, ["cover"])),
    uri: normalizeVideoUrl(row.uri, bvid),
  };
}

export function getVideoDuration(row: WatchHistoryRow) {
  return normalizeNonNegative(row.duration ?? rawNumber(row.raw, ["duration"]));
}

export function getProgressSeconds(row: WatchHistoryRow) {
  const duration = getVideoDuration(row);
  const progress = normalizeProgress(row.progress ?? rawNumber(row.raw, ["progress"]));

  if (!progress) {
    return null;
  }

  if (progress === -1) {
    return duration;
  }

  return duration ? Math.min(progress, duration) : progress;
}

export function getWatchedSeconds(row: WatchHistoryRow) {
  if (!shouldCountHistoryRow(row)) {
    return 0;
  }

  return getVideoDuration(row) ?? 0;
}

export function shouldCountHistoryRow(row: WatchHistoryRow) {
  if (!isCompletedVideo(row)) {
    return false;
  }

  if (isLongVideo(row)) {
    return row.count_override === true;
  }

  return row.count_override !== false;
}

export function hasWatchedSeconds(row: WatchHistoryRow) {
  return getWatchedSeconds(row) > 0;
}

export function isCompletedVideo(row: WatchHistoryRow) {
  if (!isVideoHistory(row)) {
    return false;
  }

  const duration = getVideoDuration(row);
  const progress = normalizeProgress(row.progress ?? rawNumber(row.raw, ["progress"]));

  if (!duration) {
    return false;
  }

  return progress === -1 || Boolean(progress && duration - progress <= COMPLETION_GRACE_SECONDS);
}

export function isLongVideo(row: WatchHistoryRow) {
  const duration = getVideoDuration(row);
  return Boolean(duration && duration >= LONG_VIDEO_SECONDS);
}

export function needsLongVideoReview(row: WatchHistoryRow) {
  return isCompletedVideo(row) && isLongVideo(row) && row.count_override === null;
}

export function getVideoHref(row: WatchHistoryRow) {
  return normalizeVideoUrl(row.uri, row.bvid ?? rawString(row.raw, ["history", "bvid"]) ?? rawString(row.raw, ["bvid"]));
}

export function getCoverUrl(row: WatchHistoryRow) {
  return normalizeExternalUrl(row.cover ?? rawString(row.raw, ["cover"]));
}

function isVideoHistory(row: WatchHistoryRow) {
  const business = row.business ?? rawString(row.raw, ["history", "business"]);
  const bvid = row.bvid ?? rawString(row.raw, ["bvid"]) ?? rawString(row.raw, ["history", "bvid"]);
  return Boolean((business && videoBusinesses.has(business)) || bvid);
}

function normalizeVideoUrl(value: string | null | undefined, bvid: string | null | undefined) {
  const normalized = normalizeExternalUrl(value);

  if (normalized?.startsWith("http://") || normalized?.startsWith("https://")) {
    if (!normalized.startsWith("bilibili://")) {
      return normalized;
    }
  }

  if (bvid) {
    return `https://www.bilibili.com/video/${bvid}`;
  }

  return null;
}

function normalizeExternalUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) {
    return null;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }

  if (url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `https://www.bilibili.com${url}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(url)) {
    return `https://${url}`;
  }

  return null;
}

function normalizeNonNegative(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function normalizeProgress(value: unknown) {
  const numberValue = Number(value);

  if (numberValue === -1) {
    return -1;
  }

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function rawNumber(raw: unknown, path: string[]) {
  const value = rawValue(raw, path);
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function rawString(raw: unknown, path: string[]) {
  const value = rawValue(raw, path);
  return typeof value === "string" && value.trim() ? value : null;
}

function rawValue(raw: unknown, path: string[]) {
  let value: unknown = raw;

  for (const key of path) {
    if (!value || typeof value !== "object" || !(key in value)) {
      return null;
    }

    value = (value as Record<string, unknown>)[key];
  }

  return value;
}
