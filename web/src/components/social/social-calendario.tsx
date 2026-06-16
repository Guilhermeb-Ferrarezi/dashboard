"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SocialNav } from "@/components/social/social-nav";
import {
  MOCK_POSTS,
  PLATFORM_DOT,
  STATUS_COLORS,
  type Post,
} from "@/components/social/social-mock-data";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon ... 6=Sun offset for the first day
function getFirstDayOffset(year: number, month: number) {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return (day + 6) % 7; // shift so Mon=0
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

interface DayProps {
  day: number;
  year: number;
  month: number;
  posts: Post[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

function DayCell({ day, year, month, posts, isToday, isCurrentMonth }: DayProps) {
  const MAX_VISIBLE = 3;
  const visible = posts.slice(0, MAX_VISIBLE);
  const overflow = posts.length - MAX_VISIBLE;

  return (
    <div
      className={cn(
        "min-h-[80px] p-1.5 rounded-lg border transition-colors",
        isCurrentMonth
          ? "bg-card border-border/40"
          : "bg-card/40 border-border/20",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-medium mb-1",
          isToday
            ? "bg-primary text-primary-foreground"
            : isCurrentMonth
              ? "text-foreground"
              : "text-muted-foreground/40",
        )}
      >
        {day}
      </span>
      <div className="space-y-0.5">
        {visible.map((post) => (
          <div
            key={post.id}
            title={`${post.title} · ${post.platform}`}
            className={cn(
              "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-default",
              STATUS_COLORS[post.status],
              "border",
            )}
          >
            <span
              className={cn("size-1.5 rounded-full shrink-0", PLATFORM_DOT[post.platform])}
            />
            <span className="truncate">{post.title}</span>
          </div>
        ))}
        {overflow > 0 && (
          <p className="pl-1 text-[10px] text-muted-foreground">+{overflow} mais</p>
        )}
      </div>
    </div>
  );
}

export function SocialCalendario() {
  const today = new Date("2026-06-16");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getFirstDayOffset(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);

  // Group posts by date string for current view
  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {};
    for (const post of MOCK_POSTS) {
      const key = post.scheduledDate;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    }
    return map;
  }, []);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y: number) => y - 1); }
    else setMonth((m: number) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y: number) => y + 1); }
    else setMonth((m: number) => m + 1);
  }

  // Build grid cells: prev overflow + current month + next overflow
  const cells: { day: number; month: "prev" | "current" | "next" }[] = [];

  for (let i = offset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: "prev" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: "current" });
  }
  const remaining = 42 - cells.length; // always 6 rows × 7 cols
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: "next" });
  }

  return (
    <div>
      <SocialNav />

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={prevMonth} className="size-8 p-0">
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="text-xs px-2 h-8"
          >
            Hoje
          </Button>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="size-8 p-0">
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const isCurrent = cell.month === "current";
          let cellYear = year;
          let cellMonth = month;
          if (cell.month === "prev") {
            cellMonth = month - 1;
            if (cellMonth < 0) { cellMonth = 11; cellYear = year - 1; }
          } else if (cell.month === "next") {
            cellMonth = month + 1;
            if (cellMonth > 11) { cellMonth = 0; cellYear = year + 1; }
          }
          const dateStr = `${cellYear}-${pad2(cellMonth + 1)}-${pad2(cell.day)}`;
          const posts = postsByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;

          return (
            <DayCell
              key={i}
              day={cell.day}
              year={cellYear}
              month={cellMonth}
              posts={posts}
              isToday={isToday}
              isCurrentMonth={isCurrent}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {(["Publicado", "Agendado", "Aprovado", "Em revisão", "Em produção", "Planejado"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn("inline-block h-2 w-3 rounded border", STATUS_COLORS[s])} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
