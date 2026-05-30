import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getUsableBilibiliCookie } from "./bilibili-auth";

type BiliHistoryItem = {
  title?: string;
  bvid?: string;
  author_mid?: number;
  author_name?: string;
  tag_name?: string;
  duration?: number;
  progress?: number;
  view_at?: number;
  cover?: string;
  uri?: string;
  history?: {
    business?: string;
    oid?: number | string;
    kid?: number | string;
    bvid?: string;
  };
  [key: string]: unknown;
};

type BiliCursor = {
  max?: number;
  view_at?: number;
  business?: string;
};

type WatchHistoryInsert = {
  business: string;
  kid: string;
  title: string;
  bvid: string | null;
  author_mid: number | null;
  author_name: string | null;
  tag_name: string | null;
  duration: number | null;
  progress: number | null;
  view_at: string;
  cover: string | null;
  uri: string | null;
  raw: BiliHistoryItem;
};

const endpoint = "https://api.bilibili.com/x/web-interface/history/cursor";
const pageSize = 30;
const maxPages = Number(process.env.SYNC_MAX_PAGES ?? 50);
const supabaseUrl = process.env.SUPABASE_URL || requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const biliCookie = await getUsableBilibiliCookie(supabase);
  const runId = await createRun();
  let fetchedCount = 0;
  let insertedCount = 0;
  let cursor: BiliCursor = {};

  try {
    for (let page = 0; page < maxPages; page += 1) {
      const response = await fetchHistory(cursor, biliCookie);
      const items = response.list.map(normalizeItem).filter(Boolean) as WatchHistoryInsert[];
      fetchedCount += items.length;

      if (items.length === 0) {
        break;
      }

      const existingKeys = await findExistingKeys(items);
      const newItems: WatchHistoryInsert[] = [];

      for (const item of items) {
        if (existingKeys.has(uniqueKey(item))) {
          break;
        }
        newItems.push(item);
      }

      if (newItems.length > 0) {
        await upsertRows(newItems);
        insertedCount += newItems.length;
      }

      cursor = response.cursor;

      if (newItems.length < items.length || !cursor.max || cursor.max <= 0) {
        break;
      }
    }

    await finishRun(runId, "success", fetchedCount, insertedCount, cursor);
    console.log(`Sync completed. fetched=${fetchedCount} inserted=${insertedCount}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(runId, "failed", fetchedCount, insertedCount, cursor, message);
    console.error(message);
    process.exitCode = 1;
  }
}

async function fetchHistory(
  cursor: BiliCursor,
  biliCookie: string,
): Promise<{ list: BiliHistoryItem[]; cursor: BiliCursor }> {
  const url = new URL(endpoint);
  url.searchParams.set("ps", String(pageSize));
  if (cursor.max) url.searchParams.set("max", String(cursor.max));
  if (cursor.view_at) url.searchParams.set("view_at", String(cursor.view_at));
  if (cursor.business) url.searchParams.set("business", cursor.business);

  const response = await fetch(url, {
    headers: {
      cookie: biliCookie,
      referer: "https://www.bilibili.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Bilibili request failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.code !== 0) {
    const hint =
      payload.code === -101
        ? "Cookie 已失效，请运行 Authorize Bilibili workflow 重新扫码登录。"
        : payload.message;
    throw new Error(`Bilibili API error ${payload.code}: ${hint}`);
  }

  return {
    list: payload.data?.list ?? [],
    cursor: payload.data?.cursor ?? {},
  };
}

function normalizeItem(item: BiliHistoryItem): WatchHistoryInsert | null {
  if (!item.view_at) {
    return null;
  }

  const business = String(item.history?.business ?? "unknown");
  const bvid = item.bvid ?? item.history?.bvid ?? null;
  const kid = String(item.history?.oid ?? item.history?.kid ?? bvid ?? item.title ?? item.view_at);

  return {
    business,
    kid,
    title: item.title ?? "未命名视频",
    bvid,
    author_mid: toNumberOrNull(item.author_mid),
    author_name: item.author_name ?? null,
    tag_name: item.tag_name ?? null,
    duration: toNumberOrNull(item.duration),
    progress: toProgressOrNull(item.progress),
    view_at: new Date(item.view_at * 1000).toISOString(),
    cover: normalizeExternalUrl(item.cover),
    uri: normalizeVideoUrl(item.uri, bvid),
    raw: item,
  };
}

async function findExistingKeys(items: WatchHistoryInsert[]) {
  const kids = Array.from(new Set(items.map((item) => item.kid)));
  const { data, error } = await supabase
    .from("watch_history")
    .select("business,kid,view_at")
    .in("kid", kids);

  if (error) {
    throw new Error(`Failed to check existing rows: ${error.message}`);
  }

  return new Set(
    (data ?? []).map((row) =>
      uniqueKey({
        business: row.business,
        kid: row.kid,
        view_at: new Date(row.view_at).toISOString(),
      }),
    ),
  );
}

async function upsertRows(rows: WatchHistoryInsert[]) {
  const { error } = await supabase
    .from("watch_history")
    .upsert(rows, { onConflict: "business,kid,view_at" });

  if (error) {
    throw new Error(`Failed to upsert watch history: ${error.message}`);
  }
}

async function createRun() {
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create sync run: ${error.message}`);
  }

  return data.id as string;
}

async function finishRun(
  id: string,
  status: "success" | "failed",
  fetchedCount: number,
  insertedCount: number,
  cursor: BiliCursor,
  errorMessage?: string,
) {
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      fetched_count: fetchedCount,
      inserted_count: insertedCount,
      last_cursor: cursor,
      error_message: errorMessage ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error(`Failed to update sync run: ${error.message}`);
  }
}

function uniqueKey(item: Pick<WatchHistoryInsert, "business" | "kid" | "view_at">) {
  return `${item.business}|${item.kid}|${new Date(item.view_at).toISOString()}`;
}

function toNumberOrNull(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function toProgressOrNull(value: unknown) {
  const numberValue = Number(value);
  if (numberValue === -1) {
    return -1;
  }

  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function normalizeVideoUrl(value: string | null | undefined, bvid: string | null) {
  return normalizeExternalUrl(value) ?? (bvid ? `https://www.bilibili.com/video/${bvid}` : null);
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

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

main();
