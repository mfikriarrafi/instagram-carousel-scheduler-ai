import React, { useState } from "react";
import { Trash2, Edit2, Info, ChevronRight, X, Calendar, AlertCircle } from "lucide-react";
import { ScheduledPost } from "../types.ts";
import StatusBadge from "./StatusBadge.tsx";

interface PostsTableProps {
  posts: ScheduledPost[];
  onCancel: (id: string) => void;
  onReschedule: (id: string, newDate: string) => void;
}

export default function PostsTable({ posts, onCancel, onReschedule }: PostsTableProps) {
  const [filter, setFilter] = useState<"all" | "scheduled" | "posted" | "failed">("all");
  const [activeCaption, setActiveCaption] = useState<ScheduledPost | null>(null);
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filtered = posts.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const getFirstSlide = (urls: string[]) => {
    if (urls && urls.length > 0) return urls[0];
    // fallback placeholder
    return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100&h=100&fit=crop";
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPost && rescheduleDate) {
      onReschedule(editPost.id, rescheduleDate);
      setEditPost(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters heading section */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "scheduled", "posted", "failed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all outline-none ${
                filter === status
                  ? "bg-[#1f1f1f] text-white border border-white/10 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 bg-transparent"
              }`}
            >
              {status} {`(${status === "all" ? posts.length : posts.filter((p) => p.status === status).length})`}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500 font-mono">Ditemukan {filtered.length} riwayat</span>
      </div>

      {/* Main Table responsive listing */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <Info className="w-8 h-8 mx-auto mb-2.5 text-zinc-600" />
            <p className="text-sm font-semibold">Tidak Ada Data</p>
            <p className="text-xs text-zinc-600 mt-1">Belum ada konten carousel terdaftar untuk kategori ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#1a1a1a] border-b border-white/10 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Slide Utang</th>
                  <th className="px-6 py-4">Caption Preview</th>
                  <th className="px-6 py-4">Jadwal Posting</th>
                  <th className="px-6 py-4">Siklus</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((post) => (
                  <tr key={post.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Image Slide list thumbnails */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 border border-white/10 shadow-inner flex-shrink-0">
                          <img
                            src={getFirstSlide(post.image_urls)}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded-md text-[8px] font-bold text-zinc-300">
                            {post.image_urls.length}P
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block">Carousel Project</span>
                          <span className="text-[10px] text-zinc-500 block truncate max-w-[100px] font-mono">
                            {post.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Expandable Caption preview */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1.5 group max-w-sm">
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {post.caption || <em className="text-zinc-600">Tanpa caption...</em>}
                        </p>
                        {post.caption && (
                          <button
                            onClick={() => setActiveCaption(post)}
                            className="p-1 rounded bg-white/5 text-zinc-400 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title="Baca Selengkapnya"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Post date and time */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <span className="text-xs text-zinc-300 block font-mono">
                          {new Date(post.scheduled_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-zinc-500 block font-mono">
                          Jam {new Date(post.scheduled_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Frequency */}
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-semibold bg-white/5 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {post.frequency || "Once"}
                      </span>
                    </td>

                    {/* Connection Status representation */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <StatusBadge status={post.status} />
                        {post.instagram_post_id && (
                          <span className="text-[9px] text-zinc-500 hover:text-blue-400 block font-mono truncate max-w-[120px]">
                            ID: {post.instagram_post_id}
                          </span>
                        )}
                        {post.status === "failed" && post.error_message && (
                          <div className="text-[9px] text-red-400 max-w-[160px] flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2" title={post.error_message}>{post.error_message}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Management and correction buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-1">
                        {post.status !== "posted" && (
                          <button
                            onClick={() => {
                              setEditPost(post);
                              // Format date local matching datetime-local value template
                              const d = new Date(post.scheduled_at);
                              const offset = d.getTimezoneOffset() * 60000;
                              const localISO = new Date(d.getTime() - offset).toISOString().slice(0, 16);
                              setRescheduleDate(localISO);
                            }}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            title="Reschedule (Ubah Tanggal)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTargetId(post.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Batal & Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Caption Viewer */}
      {activeCaption && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="font-bold text-white text-sm">Pratinjau Caption Lengkap</h4>
              <button
                onClick={() => setActiveCaption(null)}
                className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[350px] overflow-y-auto pr-1">
              <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                {activeCaption.caption}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reschedule/Date Editor */}
      {editPost && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form
            onSubmit={handleEditSubmit}
            className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-purple-400" />
                <h4 className="font-bold text-white text-sm">Reschedule Carousel</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditPost(null)}
                className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 block font-semibold">Tentukan Waktu Posting Baru</label>
              <input
                type="datetime-local"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#833AB4] to-[#405DE6] hover:opacity-90 transition-all outline-none"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Custom Confirmation Dialog for Delete/Cancel */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Konfirmasi Hapus</h4>
                <p className="text-[11px] text-zinc-400">Batalkan & hapus jadwal posting?</p>
              </div>
            </div>
            
            <p className="text-xs text-zinc-300 leading-relaxed">
              Apakah Anda yakin ingin membatalkan & menghapus jadwal posting carousel ini dari antrean?
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancel(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all outline-none"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
