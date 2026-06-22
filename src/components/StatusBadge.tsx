import React from "react";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: "scheduled" | "posted" | "failed";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "scheduled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Clock className="w-3.5 h-3.5" />
          <span>Scheduled</span>
        </span>
      );
    case "posted":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Posted</span>
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Failed</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
          <span>{status}</span>
        </span>
      );
  }
}
