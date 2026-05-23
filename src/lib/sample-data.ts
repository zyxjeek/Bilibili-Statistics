import { subDays } from "date-fns";
import type { WatchHistoryRow } from "./types";

const creators = [
  ["影视飓风", "摄影"],
  ["硬核的半佛仙人", "知识"],
  ["罗翔说刑法", "知识"],
  ["老番茄", "游戏"],
  ["何同学", "科技"],
  ["小约翰可汗", "历史"],
] as const;

export const sampleRows: WatchHistoryRow[] = Array.from({ length: 72 }).map((_, index) => {
  const [creator, tag] = creators[index % creators.length];
  const viewedAt = subDays(new Date(), Math.floor(index / 3));

  return {
    id: `demo-${index}`,
    business: "archive",
    kid: `${100000 + index}`,
    title: `${tag}视频样例 ${index + 1}`,
    bvid: `BV1Demo${index}`,
    author_mid: 10000 + (index % creators.length),
    author_name: creator,
    tag_name: tag,
    duration: 420 + ((index * 137) % 3200),
    progress: index % 4 === 0 ? -1 : 120 + ((index * 97) % 1800),
    count_override: index % 8 === 0 ? true : null,
    view_at: viewedAt.toISOString(),
    cover: null,
    uri: "https://www.bilibili.com",
    raw: {},
  };
});
