import React, { useState } from "react";
import { Sparkles, Brain, Loader2 } from "lucide-react";

interface CaptionEditorProps {
  caption: string;
  setCaption: (caption: string) => void;
  slideCount: number;
}

export default function CaptionEditor({ caption, setCaption, slideCount }: CaptionEditorProps) {
  const [description, setDescription] = useState("");
  const [tonePreset, setTonePreset] = useState("B2B");
  const [loading, setLoading] = useState(false);

  const presets = [
    { id: "B2B", label: "Formal & Profesional (B2B)", context: "Business Health Check, Corporate, Keuangan, Strategi Bisnis" },
    { id: "Workshop", label: "Antusias & Energik (Workshop)", context: "Workshop, Event, Kumpul Komunitas, Pelatihan Interaktif" },
    { id: "Creative", label: "Kreatif & Santai (Karya Seni)", context: "Seni, Desain Visual, Tips Desain, Humor Bisnis Ringan" },
  ];

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert("Masukkan minimal sedikit ide atau topik konten untuk dipetakan oleh Gemini!");
      return;
    }

    setLoading(true);
    try {
      const selectedPreset = presets.find((p) => p.id === tonePreset);
      const enhancedDescription = `Tipe Konten: Carousel dengan jumlah ${slideCount} Slide.\n\nTema Konten:\n${description}\n\nReferensi Gaya / Nada Bicara: ${selectedPreset?.label} (${selectedPreset?.context})`;

      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentDescription: enhancedDescription }),
      });

      const data = await res.json();
      if (res.ok && data.caption) {
        setCaption(data.caption);
      } else {
        throw new Error(data.error || "Gagal mendapatkan respons AI.");
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-wide">
          <Brain className="w-5 h-5 text-purple-400" />
          <span>Gemini AI Auto-Caption Writer</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Tulis pokok ide konten Anda di bawah dan biarkan model AI <strong>Gemini 2.5 Pro (via modern SDK)</strong> merajut copywriting bahasa Indonesia adaptif berdaya konversi tinggi lengkap dengan hook, visual emoji bullet, Call-to-Action, & hashtag relevan!
        </p>

        {/* Top/ide box */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Konsep Konten & Ide Slide</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Contoh: 'Panduan melakukan audit kesehatan keuangan bisnis (Business Health Check) mandiri dalam 5 langkah praktis untuk pemilik UKM...'"
            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
          />
        </div>

        {/* Presets and generator button */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-300 block">Tone Preset & Gaya</span>
            <div className="flex flex-col gap-1">
              <select
                value={tonePreset}
                onChange={(e) => setTonePreset(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] to-[#405DE6] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all outline-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Merangkai Kata...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-pulse" />
                <span>Rakit Caption AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Textarea section */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-zinc-300">Isi Caption Utama (Hasil AI / Edit Manual)</label>
          <span className="text-[11px] font-mono text-zinc-500">
            {caption.length}/2200 Karakter (Maksimal Instagram)
          </span>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={7}
          placeholder="Tulis caption Anda di sini atau ketuk tombol di atas untuk membuat caption otomatis yang engaging..."
          className="w-full bg-[#111] border border-white/10 rounded-2xl px-4 py-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500/40 focus:text-white transition-colors leading-relaxed font-sans"
        />
      </div>
    </div>
  );
}
