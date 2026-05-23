"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { WatchHistoryRow } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getCoverUrl, getProgressSeconds, getVideoDuration, getVideoHref } from "@/lib/watch-metrics";

type HistoryTableProps = {
  rows: WatchHistoryRow[];
  compact?: boolean;
};

export function HistoryTable({ rows, compact = false }: HistoryTableProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [creator, setCreator] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => row.tag_name || "未分类"))).sort()],
    [rows],
  );
  const creators = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((row) => row.author_name || "未知 UP 主"))).sort()],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const rowCategory = row.tag_name || "未分类";
        const rowCreator = row.author_name || "未知 UP 主";
        const matchKeyword =
          !keyword ||
          row.title.toLowerCase().includes(keyword) ||
          rowCreator.toLowerCase().includes(keyword) ||
          rowCategory.toLowerCase().includes(keyword);

        return (
          matchKeyword &&
          (category === "all" || rowCategory === category) &&
          (creator === "all" || rowCreator === creator)
        );
      })
      .slice(0, compact ? 12 : 200);
  }, [category, compact, creator, query, rows]);

  return (
    <section className="panel">
      <div className="panel-heading table-heading">
        <div>
          <h2>{compact ? "最近观看" : "观看明细"}</h2>
          <p>{compact ? "最近 12 条记录" : "最多展示 200 条，可按关键字、分类和 UP 主筛选"}</p>
        </div>
        {!compact ? (
          <div className="filters">
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、UP 主、分类"
              />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="分类筛选">
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "全部分类" : item}
                </option>
              ))}
            </select>
            <select value={creator} onChange={(event) => setCreator(event.target.value)} aria-label="UP 主筛选">
              {creators.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "全部 UP 主" : item}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>视频</th>
              <th>UP 主</th>
              <th>分类</th>
              <th>时长</th>
              <th>进度</th>
              <th>观看时间</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const href = getVideoHref(row);
              const progressSeconds = getProgressSeconds(row);

              return (
                <tr key={`${row.business}-${row.kid}-${row.view_at}`}>
                  <td>
                    <a
                      href={href ?? "#"}
                      target={href ? "_blank" : undefined}
                      rel={href ? "noreferrer" : undefined}
                      className={href ? "video-cell" : "video-cell disabled"}
                      onClick={(event) => {
                        if (!href) event.preventDefault();
                      }}
                    >
                      <CoverImage src={getCoverUrl(row)} />
                      <span>{row.title}</span>
                    </a>
                  </td>
                  <td>{row.author_name ?? "未知"}</td>
                  <td>{row.tag_name ?? "未分类"}</td>
                  <td>{formatDuration(getVideoDuration(row) ?? 0)}</td>
                  <td>{progressSeconds ? formatDuration(progressSeconds) : "-"}</td>
                  <td>{formatDateTime(row.view_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CoverImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className="cover-placeholder" />;
  }

  return (
    <Image
      src={src}
      alt=""
      width={108}
      height={68}
      loading="lazy"
      referrerPolicy="no-referrer"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
