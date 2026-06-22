import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar.tsx";
import ImageUploader from "./components/ImageUploader.tsx";
import CaptionEditor from "./components/CaptionEditor.tsx";
import PostsTable from "./components/PostsTable.tsx";
import StatusBadge from "./components/StatusBadge.tsx";
import { ScheduledPost, DashboardStats } from "./types.ts";
import { Toaster, toast } from "react-hot-toast";
import { 
  Instagram, 
  HelpCircle, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  ArrowUpRight, 
  Server, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ListRestart
} from "lucide-react";

export default function App() {
  const [currentTab, setTab] = useState<string>("dashboard");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [token, setToken] = useState<string>("TOKEN_ANDA_DI_SINI");
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [triggerCronLoading, setTriggerCronLoading] = useState<boolean>(false);

  // Form states for schedule
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formCaption, setFormCaption] = useState<string>("");
  const [formScheduledAt, setFormScheduledAt] = useState<string>("");
  const [formFrequency, setFormFrequency] = useState<"once" | "daily" | "weekly">("once");
  const [schedulingSubmitting, setSchedulingSubmitting] = useState<boolean>(false);

  // Settings states
  const [settingsAppId, setSettingsAppId] = useState<string>("");
  const [settingsAppSecret, setSettingsAppSecret] = useState<string>("");
  const [settingsIgUserId, setSettingsIgUserId] = useState<string>("");

  // Fetch posts and token status
  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/posts");
      if (pRes.ok) {
        const data = await pRes.json();
        setPosts(data);
      }

      const tRes = await fetch("/api/token");
      if (tRes.ok) {
        const data = await tRes.json();
        setToken(data.token);
        setTokenStatus(data.status);
      }
    } catch (err) {
      console.error("Gagal memuat data API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Default form time to tomorrow at 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const offset = tomorrow.getTimezoneOffset() * 60000;
    const localTomorrow = new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16);
    setFormScheduledAt(localTomorrow);
  }, []);

  // Submit new schedule post
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formImages.length === 0) {
      toast.error("Silakan unggah minimal 1 gambar slide carousel terlebih dahulu!");
      return;
    }
    if (!formScheduledAt) {
      toast.error("Silakan tentukan tanggal & jam posting!");
      return;
    }

    setSchedulingSubmitting(true);
    const uploadToast = toast.loading("Sedang memproses & mengunggah gambar...");

    try {
      // 1. Upload images to get cloud storage URLs
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: formImages }),
      });

      if (!uploadRes.ok) {
        throw new Error("Gagal mengunggah gambar carousel.");
      }

      const uploadData = await uploadRes.json();
      const imageUrls = uploadData.urls;

      toast.loading("Menyimpan jadwal ke database...", { id: uploadToast });

      // 2. Schedule post
      const scheduleRes = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: formScheduledAt,
          caption: formCaption,
          image_urls: imageUrls,
          frequency: formFrequency,
        }),
      });

      if (scheduleRes.ok) {
        toast.success("Hore! Carousel berhasil dijadwalkan.", { id: uploadToast });
        setFormImages([]);
        setFormCaption("");
        fetchData(); // reload posts list
        setTab("monitor"); // switch tab
      } else {
        const errorData = await scheduleRes.json();
        throw new Error(errorData.error || "Gagal mendaftarkan jadwal.");
      }
    } catch (err: any) {
      toast.error(`Gagal menyimpan: ${err.message}`, { id: uploadToast });
    } finally {
      setSchedulingSubmitting(false);
    }
  };

  // Cancel / Delete scheduled post
  const handleCancelPost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Jadwal posting berhasil dihapus.");
        fetchData();
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Gagal menghapus jadwal posting.");
    }
  };

  // Update Scheduled At date/time for post
  const handleReschedulePost = async (id: string, newDate: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: newDate }),
      });
      if (res.ok) {
        toast.success("Tanggal posting berhasil disesuaikan!");
        fetchData();
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Gagal menyesuaikan tanggal posting.");
    }
  };

  // Save Config token
  const handleSaveToken = async (newToken: string) => {
    const saveToast = toast.loading("Menyimpan token baru...");
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newToken }),
      });
      if (res.ok) {
        toast.success("Instagram Access Token berhasil diperbarui!", { id: saveToast });
        setToken(newToken);
        fetchData();
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Gagal menyimpan token ke database.", { id: saveToast });
    }
  };

  // Force trigger posting cron job manually (extremely convenient to test posting instantly!)
  const triggerCronJob = async () => {
    setTriggerCronLoading(true);
    const cronToast = toast.loading("Menjalankan siklus auto-posting (mencari jadwal jatuh tempo)...");
    try {
      const res = await fetch("/api/cron/check-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.processed > 0) {
          const successCount = data.details.filter((d: any) => d.status === "posted").length;
          toast.success(`Siklus selesai. Diproses: ${data.processed}, Sukses Terbit: ${successCount}`, { id: cronToast });
        } else {
          toast.success("Siklus selesai. Tidak ada posting yang memasuki jam jatuh tempo saat ini.", { id: cronToast });
        }
        fetchData();
      } else {
        throw new Error(data.error || "Gagal mengeksekusi cron.");
      }
    } catch (err: any) {
      toast.error(`Gagal menjalankan cron worker: ${err.message}`, { id: cronToast });
    } finally {
      setTriggerCronLoading(false);
    }
  };

  // Calculate local stats indicators
  const totalScheduled = posts.filter((p) => p.status === "scheduled").length;
  const totalPosted = posts.filter((p) => p.status === "posted").length;
  const totalFailed = posts.filter((p) => p.status === "failed").length;

  // Next post deadline prediction
  const nextPost = posts
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  // Upcoming scheduled posts in 7 days
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const upcomingQueue = posts
    .filter((p) => p.status === "scheduled" && new Date(p.scheduled_at) >= now && new Date(p.scheduled_at) <= sevenDaysLater)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Recent activity logs (max 5)
  const recentActivity = posts.slice(0, 5);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f0f0f] text-white font-sans antialiased">
      {/* Sidebar Navigation Drawer */}
      <Navbar currentTab={currentTab} setTab={setTab} tokenStatus={tokenStatus} />

      {/* Main stage section */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Main top sticky navbar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#141414] flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white capitalize">
              {currentTab === "dashboard" ? "Account Dashboard & Analytics" : `${currentTab} Panel`}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={triggerCronJob}
              disabled={triggerCronLoading}
              className="px-4 py-1.5 bg-[#1f1f1f] border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:border-purple-500/50 flex items-center gap-1.5 transition-all outline-none"
              title="Periksa jadwal postingan seketika"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${triggerCronLoading ? "animate-spin" : ""}`} />
              <span>Simulasi Posting</span>
            </button>

            <div className="h-4 w-px bg-white/10" />

            <div className="text-right">
              <p className="text-xs font-semibold text-white">Eko Supriyatno</p>
              <p className="text-[10px] text-zinc-500 font-mono">@ekosupriyatnoofficial</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#833AB4] to-[#405DE6] p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center font-bold text-xs text-white">
                ES
              </div>
            </div>
          </div>
        </header>

        {/* Content canvas container */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading && posts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-3">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
              <p className="text-sm font-semibold">Memuat database scheduler...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD */}
              {currentTab === "dashboard" && (
                <div className="space-y-8 animate-fadeIn">
                  {/* KPI card grid */}
                  <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#833AB4]/50 transition-all">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Scheduled</p>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">{totalScheduled} <span className="text-sm text-zinc-500 font-normal">Antrean</span></h2>
                      <div className="mt-2 text-xs text-blue-400 flex items-center gap-1 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>Menunggu waktu tayang</span>
                      </div>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#405DE6]/50 transition-all">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Posted</p>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">{totalPosted} <span className="text-sm text-zinc-500 font-normal">Terbit</span></h2>
                      <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{totalPosted + totalFailed > 0 ? ((totalPosted / (totalPosted + totalFailed)) * 100).toFixed(1) : 100}% Success rate</span>
                      </div>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-red-500/30 transition-all">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Failed</p>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">{totalFailed} <span className="text-sm text-zinc-500 font-normal">Gagal</span></h2>
                      <div className="mt-2 text-xs text-red-400 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{totalFailed > 0 ? "Perlu ditinjau kembali" : "Sistem berjalan mulus"}</span>
                      </div>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-all">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Next Scheduled Post</p>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                        {nextPost ? new Date(nextPost.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "— : —"}
                      </h2>
                      <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">
                          {nextPost ? new Date(nextPost.scheduled_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Belum dijadwalkan"}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Middle grid section */}
                  <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left/Middle section for Upcoming Queue list */}
                    <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                      <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-sm">Upcoming Carousels Queue (7 Hari)</h3>
                          <p className="text-xs text-zinc-500 mt-1">Daftar postingan terdaftar yang akan mengudara</p>
                        </div>
                        <button onClick={() => setTab("monitor")} className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1 outline-none">
                          <span>Kelola Semua</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-hidden">
                        {upcomingQueue.length === 0 ? (
                          <div className="py-16 text-center text-zinc-500">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                            <p className="text-xs">Tidak ada antrean terdekat dalam 7 hari ke depan.</p>
                            <button
                              onClick={() => setTab("schedule")}
                              className="mt-3 px-4 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-semibold text-purple-400 hover:text-white transition-all outline-none"
                            >
                              Buat Jadwal Pertama Anda
                            </button>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {upcomingQueue.slice(0, 5).map((post) => (
                              <div key={post.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-inner shrink-0">
                                    <img
                                      src={post.image_urls[0] || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100&h=100&fit=crop"}
                                      alt="preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                                      {post.caption || <em className="text-zinc-600 font-normal">Tanpa caption...</em>}
                                    </p>
                                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                                      Jadwal: {new Date(post.scheduled_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-full capitalize">
                                    {post.frequency}
                                  </span>
                                  <StatusBadge status={post.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right section for Gemini custom recommendations */}
                    <div className="flex flex-col gap-6">
                      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                        {/* Gradient bubble background for gemini branding */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-purple-400" />
                            </div>
                            <h3 className="font-bold text-white text-sm">Gemini AI Copy-Coach</h3>
                          </div>

                          <div className="bg-white/5 border border-white/5 rounded-xl p-4.5 text-xs leading-relaxed text-zinc-300 italic shadow-inner">
                            "Menentukan target copywriting yang fokus pada keunggulan teknis/komersial (B2B) terbukti meraup keterbacaan 45% lebih tinggi di hari Selasa & Kamis pukul 09:00 pagi. Manfaatkan preset AI untuk hasil terbaik!"
                          </div>
                        </div>

                        <div className="mt-6 space-y-3">
                          <button
                            onClick={() => setTab("schedule")}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] to-[#405DE6] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/15 hover:opacity-90 transition-all outline-none"
                          >
                            <span>Buat Jadwal Baru</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <p className="text-center text-[10px] text-zinc-500">
                            Didukung model AI Gemini 2.5 Pro terbaru
                          </p>
                        </div>
                      </div>

                      {/* Connection status card block */}
                      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Sistem Integrator</h4>
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Database Engine</span>
                            <div className="flex items-center gap-1.5 font-semibold text-white">
                              <Database className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Supabase Cloud / JSON Fallback</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Instagram Feed</span>
                            <span className="font-semibold text-white">Instagram Graph API v19.0</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Meta Callback URL</span>
                            <span className="text-[10px] font-mono text-zinc-400 max-w-[140px] truncate bg-[#111] px-1.5 py-0.5 rounded border border-white/5">
                              {process.env.APP_URL || "Simulated Host"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Recent activities section */}
                  <section className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="mb-4">
                      <h3 className="font-bold text-white text-sm">Aktivitas Posting Terakhir</h3>
                      <p className="text-xs text-zinc-500 mt-1">Daftar visual 5 postingan terakhir</p>
                    </div>

                    {recentActivity.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 text-xs">
                        Belum ada aktivitas posting terdaftar saat ini.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {recentActivity.map((act) => (
                          <div key={act.id} className="bg-zinc-900 border border-white/10 rounded-xl p-3 space-y-2.5 relative">
                            <div className="aspect-square rounded-lg overflow-hidden border border-white/5 bg-black">
                              <img
                                src={act.image_urls[0] || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100&h=100&fit=crop"}
                                alt="Activity cover"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] text-zinc-300 font-semibold truncate">
                                {act.caption || "Tanpa caption"}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {new Date(act.scheduled_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                                </span>
                                <StatusBadge status={act.status} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* TAB 2: SCHEDULE */}
              {currentTab === "schedule" && (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl animate-fadeIn space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white">Schedules Multi-Image Post</h3>
                    <p className="text-xs text-zinc-500 mt-1">Tentukan kumpulan slide dan jadwal rilis posting</p>
                  </div>

                  <form onSubmit={handleScheduleSubmit} className="space-y-6">
                    {/* 1. Drag & Drop file input section */}
                    <ImageUploader images={formImages} onChange={setFormImages} />

                    {/* 2. Automated AI editor text areas */}
                    <CaptionEditor
                      caption={formCaption}
                      setCaption={setFormCaption}
                      slideCount={formImages.length}
                    />

                    {/* 3. Operational configs (Date, hour, Frequency) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/40 p-5 rounded-xl border border-white/10">
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-300 font-semibold block">Tanggal & Waktu Posting</label>
                        <input
                          type="datetime-local"
                          required
                          value={formScheduledAt}
                          onChange={(e) => setFormScheduledAt(e.target.value)}
                          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 outline-none"
                        />
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          Mengikuti zona waktu komputer Anda. Auto-poster akan merujuk jadwal ini.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-300 font-semibold block">Siklus / Frekuensi Repeat</label>
                        <select
                          value={formFrequency}
                          onChange={(e) => setFormFrequency(e.target.value as any)}
                          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 outline-none"
                        >
                          <option value="once">Sekali Posting (Once)</option>
                          <option value="daily">Harian (Daily)</option>
                          <option value="weekly">Mingguan (Weekly)</option>
                        </select>
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          Pilihan Harian/Mingguan otomatis akan membuat jadwal baru yang berulang setelah tayang.
                        </p>
                      </div>
                    </div>

                    {/* Submit schedule banner */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={schedulingSubmitting}
                        className="px-8 py-3 bg-gradient-to-r from-[#833AB4] to-[#405DE6] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 disabled:opacity-50 transition-all outline-none flex items-center gap-2"
                      >
                        {schedulingSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Menjadwalkan...</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-white" />
                            <span>Amankan Jadwal Carousel</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: MONITORING */}
              {currentTab === "monitor" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-bold text-white">Monitoring Antrean & Riwayat</h3>
                    <p className="text-xs text-zinc-500 mt-1">Daftar semua postingan terjadwal, terbit, maupun yang gagal tayang.</p>
                  </div>

                  <PostsTable
                    posts={posts}
                    onCancel={handleCancelPost}
                    onReschedule={handleReschedulePost}
                  />
                </div>
              )}

              {/* TAB 4: SETTINGS */}
              {currentTab === "settings" && (
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl animate-fadeIn space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-base font-bold text-white">Konfigurasi Pengembang</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Konfigurasikan integrasi Instagram Graph API tanpa perlu mengakses database utama PostgreSQL secara manual.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Access token card section */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-300 font-semibold block">Instagram Access Token (Simpan di Database)</label>
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Contoh: EAAX..."
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-purple-500/50 outline-none"
                      />
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Mewakili izin aplikasi Meta untuk mempublikasikan post atas nama @ekosupriyatnoofficial.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleSaveToken(token)}
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider outline-none transition-colors"
                      >
                        Simpan Token Ke Database
                      </button>
                    </div>

                    <div className="h-px bg-white/10 my-4" />

                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider pt-2">Environment Variables Ref (.env)</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Sesuai parameter Meta Graph API, nilai berikut diakses dari berkas keamanan server <code>.env</code> Anda:
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-xl border border-white/5 text-xs font-mono text-zinc-400">
                      <div>
                        <span className="text-zinc-650 block text-[10px] text-zinc-500">INSTAGRAM_USER_ID</span>
                        <span className="text-white text-xs truncate block mt-0.5">
                          {process.env.INSTAGRAM_USER_ID || "178414000000000 (Placeholder)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-650 block text-[10px] text-zinc-500">META_APP_ID</span>
                        <span className="text-white text-xs truncate block mt-0.5">
                          {process.env.META_APP_ID || "— (Bypass untuk simulasi)"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#141414] p-4 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                      <div className="flex gap-2 text-purple-400 font-bold mb-1">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span>Mode Simulasi Aman Terintegrasi</span>
                      </div>
                      Jika Anda ingin menguji seluruh alur kerja ini langsung tanpa mengonfigurasi Meta Token asli, Anda dapat menggunakan nilai bawaan / acak. Sistem kami akan memperlakukannya secara aman sebagai <strong>Simulated Posting</strong> dengan visual hasil, status badge, riwayat, log, dan penguji waktu tayang yang berfungsi 100% sempurna!
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  );
}
