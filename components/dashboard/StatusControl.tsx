"use client";

import { ChevronDown } from "lucide-react";
import type { EntryStatus } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusChip } from "./StatusChip";

interface StatusControlProps {
  status: EntryStatus;
  onChange: (status: EntryStatus) => void;
}

/** Clickable status chip with a dropdown to change status inline. */
export function StatusControl({ status, onChange }: StatusControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-test-id="status-control"
          aria-label="Change status"
          className="inline-flex items-center gap-0.5 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-brand"
        >
          <StatusChip status={status} />
          <ChevronDown size={12} className="text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-0">
        {STATUS_ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            data-test-id={`status-option-${s}`}
            onSelect={() => {
              if (s !== status) onChange(s);
            }}
            className={`p-1 ${s === status ? "ring-1 ring-blue-brand/40" : ""}`}
          >
            <StatusChip status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
