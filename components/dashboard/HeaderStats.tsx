"use client";

import { useMemo } from "react";
import { CalendarCheck, Clock, Flame } from "lucide-react";
import type { Entry } from "@/lib/types";
import { formatHours } from "@/lib/format/time";
import { calcStreak } from "@/lib/format/streak";

interface HeaderStatsProps {
  entries: Entry[];
  selectedDate: string;
}

export function HeaderStats({ entries, selectedDate }: HeaderStatsProps) {
  const { count, minutes, streak } = useMemo(() => {
    const dayEntries = entries.filter((e) => e.entry_date === selectedDate);
    return {
      count: dayEntries.length,
      minutes: dayEntries.reduce((a, e) => a + e.minutes, 0),
      streak: calcStreak(entries.map((e) => e.entry_date)),
    };
  }, [entries, selectedDate]);

  const stats = [
    { icon: CalendarCheck, label: "This day", value: `${count}`, tone: "#2E7CC4" },
    { icon: Clock, label: "Logged", value: formatHours(minutes), tone: "#123E66" },
    {
      icon: Flame,
      label: "Day streak",
      value: `${streak}`,
      tone: streak > 0 ? "#F37E31" : "#647587",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="card flex items-center gap-3 p-3" data-test-id={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${s.tone}1a`, color: s.tone }}
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-navy">{s.value}</p>
              <p className="mt-1 truncate text-xs text-muted">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
