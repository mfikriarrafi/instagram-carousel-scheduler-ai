import React from "react";
import { LayoutDashboard, Calendar, Eye, Settings, Instagram, AlertCircle, CheckCircle } from "lucide-react";

interface NavbarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  tokenStatus: {
    isValid: boolean;
    expiresInDays?: number;
    isSimulated: boolean;
    errorMessage?: string;
  } | null;
}

export default function Navbar({ currentTab, setTab, tokenStatus }: NavbarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "monitor", label: "Monitoring", icon: Eye },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-[#141414] flex flex-col flex-shrink-0 h-full">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#833AB4] to-[#405DE6] flex items-center justify-center shadow-lg shadow-purple-500/10">
          <Instagram className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight text-white block">InstaAuto</span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Carousel Scheduler</span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none ${
                isActive
                  ? "bg-gradient-to-r from-[#833AB4] to-[#405DE6] text-white shadow-md shadow-purple-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-zinc-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Token Active footer metric */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        {tokenStatus ? (
          tokenStatus.isValid ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-3 shadow-inner">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-400 truncate">Token Aktif</p>
                <p className="text-[10px] text-zinc-500 truncate font-mono">
                  {tokenStatus.isSimulated ? "Mode Percobaan" : `Aktif ${tokenStatus.expiresInDays || 60} hari`}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-3 shadow-inner">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 animate-pulse">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-400 truncate">Token Konfigurasi</p>
                <p className="text-[10px] text-zinc-500 truncate">Harap setup di Settings</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex animate-pulse items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800"></div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
              <div className="h-2.5 bg-zinc-800 rounded w-3/4"></div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
