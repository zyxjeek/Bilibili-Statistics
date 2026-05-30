import "dotenv/config";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type BilibiliCredential = {
  cookie: string;
  refresh_token: string | null;
  updated_at?: string;
  source?: string;
};

type CookieInfoPayload = {
  code: number;
  message?: string;
  data?: {
    refresh?: boolean;
    timestamp?: number;
  };
};

type QrGeneratePayload = {
  code: number;
  message?: string;
  data?: {
    url?: string;
    qrcode_key?: string;
  };
};

type QrPollPayload = {
  code: number;
  message?: string;
  data?: {
    code?: number;
    message?: string;
    refresh_token?: string;
  };
};

type RefreshPayload = {
  code: number;
  message?: string;
  data?: {
    refresh_token?: string;
  };
};

const credentialKey = "bilibili_credentials";
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";
const refreshPublicKey = {
  kty: "RSA",
  n: "y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE",
  e: "AQAB",
};

export function createSupabaseServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function getUsableBilibiliCookie(supabase: SupabaseClient) {
  const envCookie = process.env.BILI_COOKIE?.trim();
  let credential: BilibiliCredential | null = null;

  try {
    credential = await getStoredBilibiliCredential(supabase);
  } catch (error) {
    if (envCookie) {
      console.warn(`读取 Supabase 中的 Bilibili 凭据失败，将回退到环境变量 BILI_COOKIE。${formatError(error)}`);
      return envCookie;
    }

    throw error;
  }

  if (credential) {
    const refreshed = await refreshBilibiliCredentialIfNeeded(supabase, credential);
    return refreshed.cookie;
  }

  if (envCookie) {
    return envCookie;
  }

  throw new Error(
    "缺少 Bilibili 登录凭据。请先运行 GitHub Actions 中的 Authorize Bilibili workflow，或本地运行 npm run auth:bilibili 完成扫码登录。",
  );
}

export async function loginAndStoreBilibiliCredential(supabase: SupabaseClient) {
  const login = await waitForQrLogin();
  const credential: BilibiliCredential = {
    cookie: login.cookie,
    refresh_token: login.refreshToken,
    updated_at: new Date().toISOString(),
    source: "qr-login",
  };

  await saveBilibiliCredential(supabase, credential);
  console.log("Bilibili 登录凭据已保存到 Supabase。后续同步会自动读取并按需刷新。");
}

async function getStoredBilibiliCredential(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", credentialKey)
    .maybeSingle();

  if (error) {
    throw new Error(`读取 Bilibili 凭据失败：${error.message}`);
  }

  const value = data?.value;
  if (!isCredential(value)) {
    return null;
  }

  return value;
}

async function saveBilibiliCredential(supabase: SupabaseClient, credential: BilibiliCredential) {
  const { error } = await supabase.from("app_secrets").upsert(
    {
      key: credentialKey,
      value: {
        ...credential,
        updated_at: new Date().toISOString(),
      },
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`保存 Bilibili 凭据失败：${error.message}`);
  }
}

async function refreshBilibiliCredentialIfNeeded(
  supabase: SupabaseClient,
  credential: BilibiliCredential,
): Promise<BilibiliCredential> {
  const info = await fetchCookieInfo(credential.cookie);
  if (!info.data?.refresh) {
    return credential;
  }

  if (!credential.refresh_token) {
    throw new Error("Bilibili Cookie 需要刷新，但 Supabase 中没有 refresh_token。请重新扫码登录。");
  }

  console.log("Bilibili Cookie 需要刷新，正在自动刷新...");

  const oldRefreshToken = credential.refresh_token;
  const timestamp = info.data.timestamp ?? Date.now();
  const refreshCsrf = await fetchRefreshCsrf(timestamp, credential.cookie);
  const refreshed = await refreshCookie(credential.cookie, oldRefreshToken, refreshCsrf);
  await confirmRefresh(refreshed.cookie, oldRefreshToken);

  const nextCredential: BilibiliCredential = {
    cookie: refreshed.cookie,
    refresh_token: refreshed.refreshToken,
    updated_at: new Date().toISOString(),
    source: "refresh",
  };

  await saveBilibiliCredential(supabase, nextCredential);
  console.log("Bilibili Cookie 已刷新并保存。");
  return nextCredential;
}

async function fetchCookieInfo(cookie: string) {
  const csrf = getCookieValue(cookie, "bili_jct");
  const url = new URL("https://passport.bilibili.com/x/passport-login/web/cookie/info");
  if (csrf) {
    url.searchParams.set("csrf", csrf);
  }

  const response = await fetch(url, {
    headers: biliHeaders(cookie),
  });
  const payload = (await response.json()) as CookieInfoPayload;

  if (payload.code !== 0) {
    throw new Error(
      `Bilibili Cookie 检查失败 ${payload.code}: ${payload.message ?? "未知错误"}。请重新扫码登录。`,
    );
  }

  return payload;
}

async function fetchRefreshCsrf(timestamp: number, cookie: string) {
  const correspondPath = await getCorrespondPath(timestamp);
  const response = await fetch(`https://www.bilibili.com/correspond/1/${correspondPath}`, {
    headers: biliHeaders(cookie),
  });

  if (!response.ok) {
    throw new Error(`获取 Bilibili refresh_csrf 失败：HTTP ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/<div[^>]+id=["']1-name["'][^>]*>([^<]+)<\/div>/);
  const refreshCsrf = match?.[1]?.trim();
  if (!refreshCsrf) {
    throw new Error("获取 Bilibili refresh_csrf 失败：响应中没有找到刷新口令。");
  }

  return refreshCsrf;
}

async function refreshCookie(cookie: string, refreshToken: string, refreshCsrf: string) {
  const csrf = requireCookieValue(cookie, "bili_jct");
  const body = new URLSearchParams({
    csrf,
    refresh_csrf: refreshCsrf,
    source: "main_web",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://passport.bilibili.com/x/passport-login/web/cookie/refresh", {
    method: "POST",
    headers: {
      ...biliHeaders(cookie),
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as RefreshPayload;

  if (payload.code !== 0 || !payload.data?.refresh_token) {
    throw new Error(`刷新 Bilibili Cookie 失败 ${payload.code}: ${payload.message ?? "未知错误"}`);
  }

  return {
    cookie: mergeCookieHeader(cookie, getSetCookie(response.headers)),
    refreshToken: payload.data.refresh_token,
  };
}

async function confirmRefresh(cookie: string, oldRefreshToken: string) {
  const csrf = requireCookieValue(cookie, "bili_jct");
  const response = await fetch("https://passport.bilibili.com/x/passport-login/web/confirm/refresh", {
    method: "POST",
    headers: {
      ...biliHeaders(cookie),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      csrf,
      refresh_token: oldRefreshToken,
    }),
  });
  const payload = (await response.json()) as { code: number; message?: string };

  if (payload.code !== 0) {
    throw new Error(`确认 Bilibili Cookie 刷新失败 ${payload.code}: ${payload.message ?? "未知错误"}`);
  }
}

async function waitForQrLogin() {
  const response = await fetch("https://passport.bilibili.com/x/passport-login/web/qrcode/generate", {
    headers: biliHeaders(),
  });
  const generated = (await response.json()) as QrGeneratePayload;
  const qrUrl = generated.data?.url;
  const qrKey = generated.data?.qrcode_key;

  if (generated.code !== 0 || !qrUrl || !qrKey) {
    throw new Error(`生成 Bilibili 登录二维码失败 ${generated.code}: ${generated.message ?? "未知错误"}`);
  }

  console.log("请用 Bilibili 手机客户端扫描下面的二维码，并在手机上确认登录。二维码 180 秒后失效。");
  console.log(qrUrl);
  printQrCode(qrUrl);

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await delay(3_000);
    const pollUrl = new URL("https://passport.bilibili.com/x/passport-login/web/qrcode/poll");
    pollUrl.searchParams.set("qrcode_key", qrKey);

    const pollResponse = await fetch(pollUrl, {
      headers: biliHeaders(),
    });
    const payload = (await pollResponse.json()) as QrPollPayload;
    const code = payload.data?.code;

    if (payload.code !== 0) {
      throw new Error(`轮询 Bilibili 登录状态失败 ${payload.code}: ${payload.message ?? "未知错误"}`);
    }

    if (code === 0) {
      const cookie = mergeCookieHeader("", getSetCookie(pollResponse.headers));
      const refreshToken = payload.data?.refresh_token ?? null;
      if (!cookie || !refreshToken) {
        throw new Error("Bilibili 扫码已确认，但响应中没有返回完整 Cookie 或 refresh_token。");
      }

      console.log("扫码确认成功。");
      return { cookie, refreshToken };
    }

    if (code === 86038) {
      throw new Error("Bilibili 登录二维码已失效，请重新运行登录 workflow。");
    }

    if (code === 86090) {
      console.log("已扫码，等待手机端确认...");
    } else if (code === 86101) {
      console.log("等待扫码...");
    } else {
      console.log(`等待登录确认：${payload.data?.message ?? code ?? "未知状态"}`);
    }
  }

  throw new Error("等待 Bilibili 扫码登录超时，请重新运行登录 workflow。");
}

async function getCorrespondPath(timestamp: number) {
  const key = await crypto.subtle.importKey(
    "jwk",
    refreshPublicKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const data = new TextEncoder().encode(`refresh_${timestamp}`);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, data));
  return Array.from(encrypted, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function biliHeaders(cookie?: string) {
  return {
    "user-agent": userAgent,
    referer: "https://www.bilibili.com/",
    ...(cookie ? { cookie } : {}),
  };
}

function printQrCode(url: string) {
  try {
    const require = createRequire(import.meta.url);
    const qrcode = require("qrcode-terminal") as {
      generate(input: string, options: { small: boolean }, callback: (output: string) => void): void;
    };

    qrcode.generate(url, { small: true }, (output) => {
      console.log(output);
    });
  } catch {
    console.log("当前环境无法渲染终端二维码，请打开上面的链接完成登录。");
  }
}

function getSetCookie(headers: Headers) {
  const extendedHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof extendedHeaders.getSetCookie === "function") {
    return extendedHeaders.getSetCookie();
  }

  const header = headers.get("set-cookie");
  return header ? splitSetCookieHeader(header) : [];
}

function splitSetCookieHeader(header: string) {
  return header.split(/,(?=\s*[^;,]+=)/);
}

function mergeCookieHeader(existingCookie: string, setCookies: string[]) {
  const cookies = new Map<string, string>();

  for (const part of existingCookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    cookies.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
  }

  for (const setCookie of setCookies) {
    const pair = setCookie.split(";", 1)[0]?.trim();
    if (!pair) continue;

    const separator = pair.indexOf("=");
    if (separator <= 0) continue;

    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }

  return Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
}

function getCookieValue(cookie: string, name: string) {
  for (const part of cookie.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    if (trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }

  return null;
}

function requireCookieValue(cookie: string, name: string) {
  const value = getCookieValue(cookie, name);
  if (!value) {
    throw new Error(`Bilibili Cookie 缺少 ${name}，请重新扫码登录。`);
  }

  return value;
}

function isCredential(value: unknown): value is BilibiliCredential {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BilibiliCredential>;
  return typeof candidate.cookie === "string" && candidate.cookie.length > 0;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const command = process.argv[2] ?? "login";
  if (command !== "login") {
    throw new Error(`Unknown command: ${command}`);
  }

  await loginAndStoreBilibiliCredential(createSupabaseServiceClient());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(formatError(error));
    process.exitCode = 1;
  });
}
