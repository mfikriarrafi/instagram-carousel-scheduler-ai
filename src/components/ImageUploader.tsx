import React, { useRef, useState } from "react";
import { UploadCloud, X, ArrowLeft, ArrowRight, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  images: string[]; // base64 representation of files
  onChange: (images: string[]) => void;
}

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Convert raw File object to base64 string
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Hanya berkas berformat gambar (PNG, JPG, JPEG) yang diperbolehkan!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        if (images.length >= 8) {
          alert("Batas maksimal adalah 8 slide per carousel!");
          return;
        }
        onChange([...images, e.target.result]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFiles = (fileList: FileList) => {
    const spaceLeft = 8 - images.length;
    const filesToUpload = Array.from(fileList).slice(0, spaceLeft);
    filesToUpload.forEach(handleFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onChange(updated);
  };

  const moveRight = (index: number) => {
    if (index === images.length - 1) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-zinc-300 block">
          Unggah Gambar Slide Carousel
        </label>
        <span className="text-xs font-mono text-zinc-500">
          {images.length}/8 Slide Terpilih
        </span>
      </div>

      {/* Drag & Drop Canvas Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[160px] ${
          dragActive
            ? "border-purple-500 bg-purple-500/10 text-white"
            : images.length > 0
            ? "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-zinc-400 hover:border-zinc-700"
            : "border-white/10 bg-black/45 hover:bg-white/5 text-zinc-400 hover:border-zinc-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*"
          onChange={onFileInputChange}
          disabled={images.length >= 8}
        />
        <div className="p-3 bg-white/5 rounded-full mb-3 shadow-inner">
          <UploadCloud className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-sm font-semibold text-white text-center">
          Tarik & Lepaskan Gambar di sini, atau <span className="text-purple-400 hover:underline">Telusuri</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1.5 text-center">
          Mendukung PNG, JPG, JPEG (Max 8 slide)
        </p>
      </div>

      {/* Slide Thumbnails & Preview Panel with swap controls */}
      {images.length > 0 && (
        <div className="space-y-3 bg-[#111] border border-white/5 p-4 rounded-2xl">
          <div className="font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Urutan Slide (Bisa Digeser / Dihapus)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 bg-zinc-900 flex flex-col justify-between">
                <img src={img} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                
                {/* Overlay index tag */}
                <div className="absolute top-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded-md text-[10px] font-bold text-white tracking-tight border border-white/10">
                  {idx + 1}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 outline-none"
                  title="Hapus Slide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Rearrange footer overlay inside slide */}
                <div className="absolute bottom-1 left-0 right-0 justify-center gap-1.5 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/80 py-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLeft(idx);
                    }}
                    disabled={idx === 0}
                    className="p-0.5 text-zinc-300 hover:text-white disabled:text-zinc-600 disabled:pointer-events-none"
                    title="Geser Kiri"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-zinc-400 flex items-center font-semibold uppercase">Slide {idx+1}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveRight(idx);
                    }}
                    disabled={idx === images.length - 1}
                    className="p-0.5 text-zinc-300 hover:text-white disabled:text-zinc-600 disabled:pointer-events-none"
                    title="Geser Kanan"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
