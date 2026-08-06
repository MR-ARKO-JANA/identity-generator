"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { getBuilderClass } from "@/lib/builderClass";
import { drawQrCode } from "@/lib/qrGenerator";
import { playSound } from "@/lib/audioFx";

type Format = "PFP_FRAME" | "BUILDER_ID";
type ThemeKey = "CYPHERPUNK" | "SUNSET" | "MATRIX" | "SOLANA";
type FilterKey = "none" | "cyberpunk" | "mono" | "warm";
type StickerKey = "SOLANA_DEV" | "AI_ARCHITECT" | "ZK_PROOF" | "HH_GOA_VIP";

interface ArchiveItem {
  id: string;
  image_url: string;
  format_type: string;
  created_at: string;
}

const THEMES: Record<
  ThemeKey,
  {
    name: string;
    bg: string;
    surface: string;
    primary: string;
    secondary: string;
    textDark: string;
    headerBg: string;
    border: string;
  }
> = {
  CYPHERPUNK: {
    name: "HH Goa Cypherpunk",
    bg: "#0B5C36",
    surface: "#FDF8E4",
    primary: "#FF007F",
    secondary: "#FFCC00",
    textDark: "#05301C",
    headerBg: "#0B5C36",
    border: "#0B5C36",
  },
  SUNSET: {
    name: "Goa Sunset",
    bg: "#005C53",
    surface: "#FFF5EB",
    primary: "#FF5964",
    secondary: "#F4A261",
    textDark: "#002925",
    headerBg: "#005C53",
    border: "#005C53",
  },
  MATRIX: {
    name: "Matrix Terminal",
    bg: "#0D1117",
    surface: "#161B22",
    primary: "#00FF66",
    secondary: "#58A6FF",
    textDark: "#F0F6FC",
    headerBg: "#0D1117",
    border: "#00FF66",
  },
  SOLANA: {
    name: "Solana Multichain",
    bg: "#1A0933",
    surface: "#2C004D",
    primary: "#14F195",
    secondary: "#9945FF",
    textDark: "#F3E8FF",
    headerBg: "#2C004D",
    border: "#14F195",
  },
};

export default function Home() {
  const [format, setFormat] = useState<Format>("BUILDER_ID");
  const [theme, setTheme] = useState<ThemeKey>("CYPHERPUNK");
  const [filter, setFilter] = useState<FilterKey>("none");
  const [sticker, setSticker] = useState<StickerKey>("SOLANA_DEV");

  // Image Adjustment States (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Audio & Toast UI States
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [builderName, setBuilderName] = useState("ANON_BUILDER");
  const [stackRole, setStackRole] = useState("FULLSTACK");
  const [bio, setBio] = useState("Less Noise. More Signal.");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<"ARCHIVE" | "MANIFESTO" | null>(null);
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const currentTheme = THEMES[theme];
  const computedClass = getBuilderClass(builderName, stackRole);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // HEIC & Image Upload Handler with Web Worker Offloading
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playSound("upload", soundEnabled);

    const isHeic =
      file.type.toLowerCase().includes("heic") ||
      file.type.toLowerCase().includes("heif") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
      setIsConvertingHeic(true);
      try {
        const worker = new Worker("/heic-worker.js");
        const workerPromise = new Promise<Blob>((resolve, reject) => {
          const messageId = Math.random().toString();
          worker.onmessage = (msg) => {
            if (msg.data.id === messageId) {
              if (msg.data.success && msg.data.blob) {
                resolve(msg.data.blob);
              } else {
                reject(new Error(msg.data.error || "HEIC conversion failed in worker"));
              }
              worker.terminate();
            }
          };
          worker.postMessage({ id: messageId, blob: file });
        });

        const convertedBlob = await workerPromise;
        const url = URL.createObjectURL(convertedBlob);
        setImageSrc(url);
      } catch (workerErr) {
        console.warn("Worker HEIC conversion failed, falling back to dynamic import", workerErr);
        try {
          const heic2any = (await import("heic2any")).default;
          const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          const blob = Array.isArray(result) ? result[0] : result;
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
        } catch (err) {
          console.error("HEIC parsing error:", err);
          alert("Failed to parse HEIC image. Please upload a JPEG or PNG.");
        }
      } finally {
        setIsConvertingHeic(false);
      }
    } else {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const applyCanvasFilter = (ctx: CanvasRenderingContext2D) => {
    if (filter === "cyberpunk") {
      ctx.filter = "contrast(140%) saturate(160%) hue-rotate(-10deg)";
    } else if (filter === "mono") {
      ctx.filter = "grayscale(100%) contrast(200%) brightness(90%)";
    } else if (filter === "warm") {
      ctx.filter = "sepia(40%) saturate(140%) brightness(105%)";
    } else {
      ctx.filter = "none";
    }
  };

  // ─── PFP FRAME Renderer (1200 x 1200 px - 1:1 Aspect Ratio) ──────────────
  const drawPfpFrame = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    const size = 1200;
    const canvas = canvasRef.current!;
    canvas.width = size;
    canvas.height = size;
    const t = currentTheme;

    // 1. Fill background
    ctx.fillStyle = t.surface;
    ctx.fillRect(0, 0, size, size);

    // 2. Outer border
    ctx.lineWidth = 20;
    ctx.strokeStyle = t.border;
    ctx.strokeRect(0, 0, size, size);

    // 3. Draw the uploaded photo, center-cropped into a circle with Zoom & Pan
    const photoRadius = 420;
    const cx = size / 2;
    const cy = size / 2 - 20;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius, 0, Math.PI * 2);
    ctx.clip();

    applyCanvasFilter(ctx);

    // Center-weighted scale calculation with zoom & pan offsets
    const baseScale = Math.max((photoRadius * 2) / img.width, (photoRadius * 2) / img.height);
    const finalScale = baseScale * zoom;
    const dx = cx - (img.width * finalScale) / 2 + panX;
    const dy = cy - (img.height * finalScale) / 2 + panY;

    ctx.drawImage(img, dx, dy, img.width * finalScale, img.height * finalScale);
    ctx.restore();

    // 4. Branded ring frame
    ctx.lineWidth = 24;
    ctx.strokeStyle = t.primary;
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Outer accent ring
    ctx.lineWidth = 8;
    ctx.strokeStyle = t.secondary;
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius + 20, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dark border
    ctx.lineWidth = 6;
    ctx.strokeStyle = t.border;
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius - 12, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Corner brand marks
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 10;
    const cornerSize = 70;
    const margin = 50;

    // Top Left
    ctx.beginPath();
    ctx.moveTo(margin, margin + cornerSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + cornerSize, margin);
    ctx.stroke();
    // Top Right
    ctx.beginPath();
    ctx.moveTo(size - margin - cornerSize, margin);
    ctx.lineTo(size - margin, margin);
    ctx.lineTo(size - margin, margin + cornerSize);
    ctx.stroke();
    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(margin, size - margin - cornerSize);
    ctx.lineTo(margin, size - margin);
    ctx.lineTo(margin + cornerSize, size - margin);
    ctx.stroke();
    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(size - margin - cornerSize, size - margin);
    ctx.lineTo(size - margin, size - margin);
    ctx.lineTo(size - margin, size - margin - cornerSize);
    ctx.stroke();

    // 6. Header branding
    ctx.fillStyle = t.border;
    ctx.font = "bold 42px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("HACKER HOUSE GOA", cx, 85);

    // 7. Footer text
    ctx.fillStyle = t.border;
    ctx.font = "bold 52px 'Space Mono', monospace";
    ctx.fillText("2 0 2 6", cx, size - 50);

    // 8. Brand dots
    const dotY = size - 110;
    [
      { x: cx - 160, color: t.primary },
      { x: cx, color: t.secondary },
      { x: cx + 160, color: t.border },
    ].forEach(({ x, color }) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, dotY, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // ─── BUILDER ID Renderer (1200 x 675 px - 16:9 Aspect Ratio) ────────────
  const drawBuilderId = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    const W = 1200;
    const H = 675;
    const canvas = canvasRef.current!;
    canvas.width = W;
    canvas.height = H;
    const t = currentTheme;

    // 1. Base Card Background
    ctx.fillStyle = t.surface;
    ctx.fillRect(0, 0, W, H);

    // Outer Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = t.border;
    ctx.strokeRect(0, 0, W, H);

    // Inner Accent Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = t.border;
    ctx.strokeRect(18, 18, W - 36, H - 36);

    // Top Header Banner Stripe
    ctx.fillStyle = t.headerBg;
    ctx.fillRect(0, 0, W, 70);

    ctx.fillStyle = t.surface;
    ctx.font = "bold 32px 'Space Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("HACKER HOUSE GOA 2026", 40, 46);

    ctx.fillStyle = t.secondary;
    ctx.font = "bold 20px 'Space Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("// BUILDER PASSPORT", W - 40, 44);

    // 2. Photo Container (Left Side)
    const photoBoxSize = 460;
    const photoX = 50;
    const photoY = 110;

    // Photo background placeholder
    ctx.fillStyle = t.border;
    ctx.fillRect(photoX - 4, photoY - 4, photoBoxSize + 8, photoBoxSize + 8);

    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoBoxSize, photoBoxSize);
    ctx.clip();

    applyCanvasFilter(ctx);

    // Center-Weighted Object-Fit Cover with Zoom & Pan
    const baseScale = Math.max(photoBoxSize / img.width, photoBoxSize / img.height);
    const finalScale = baseScale * zoom;
    const dx = photoX + (photoBoxSize - img.width * finalScale) / 2 + panX;
    const dy = photoY + (photoBoxSize - img.height * finalScale) / 2 + panY;

    ctx.drawImage(img, dx, dy, img.width * finalScale, img.height * finalScale);
    ctx.restore();

    // Photo Border Overlay
    ctx.lineWidth = 6;
    ctx.strokeStyle = t.primary;
    ctx.strokeRect(photoX, photoY, photoBoxSize, photoBoxSize);

    // Corner pin graphic on photo
    ctx.fillStyle = t.secondary;
    ctx.fillRect(photoX + 10, photoY + 10, 16, 16);

    // 3. Right Side Details Section
    const textLeft = 550;

    // Holographic Sticker / Badge Seal
    const stickerText = sticker.replace("_", " ");
    ctx.fillStyle = t.secondary;
    ctx.font = "bold 16px 'Space Mono', monospace";
    ctx.fillRect(textLeft, 100, 180, 28);
    ctx.strokeStyle = t.border;
    ctx.strokeRect(textLeft, 100, 180, 28);
    ctx.fillStyle = "#000000";
    ctx.fillText(`// ${stickerText}`, textLeft + 12, 120);

    // Builder Name
    ctx.fillStyle = t.border;
    ctx.font = "900 52px 'Playfair Display', serif";
    ctx.textAlign = "left";
    ctx.fillText((builderName || "ANON_BUILDER").toUpperCase(), textLeft, 175);

    // Algorithmic Builder Class Tag
    const classBadgeY = 205;
    ctx.fillStyle = t.primary;
    const classText = `CLASS: ${computedClass.toUpperCase()}`;
    ctx.font = "bold 22px 'Space Mono', monospace";
    const classMetrics = ctx.measureText(classText);
    const classPillW = Math.min(classMetrics.width + 36, 450);
    const classPillH = 40;

    ctx.fillRect(textLeft, classBadgeY, classPillW, classPillH);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(textLeft, classBadgeY, classPillW, classPillH);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(classText, textLeft + 16, classBadgeY + 27);

    // Stack / Role Pill
    const roleY = 260;
    const roleText = `STACK: ${(stackRole || "FULLSTACK").toUpperCase()}`;
    ctx.font = "bold 20px 'Space Mono', monospace";
    const roleMetrics = ctx.measureText(roleText);
    const rolePillW = Math.min(roleMetrics.width + 30, 450);
    const rolePillH = 36;

    ctx.fillStyle = t.secondary;
    ctx.fillRect(textLeft, roleY, rolePillW, rolePillH);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(textLeft, roleY, rolePillW, rolePillH);

    ctx.fillStyle = t.border;
    ctx.fillText(roleText, textLeft + 14, roleY + 24);

    // Bio / Quote Line
    ctx.fillStyle = t.border;
    ctx.font = "bold italic 22px 'Space Mono', monospace";

    const bioText = `"${bio || "Less Noise. More Signal."}"`;
    let currentLine = "";
    let lineY = 330;
    const maxBioWidth = 460;
    const bioLineHeight = 32;

    const words = bioText.split(" ");
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + " ";
      if (ctx.measureText(testLine).width > maxBioWidth && currentLine !== "") {
        ctx.fillText(currentLine.trim(), textLeft, lineY);
        currentLine = words[i] + " ";
        lineY += bioLineHeight;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.trim() !== "") {
      ctx.fillText(currentLine.trim(), textLeft, lineY);
    }

    // 4. Draw Dynamic QR Code (Bottom Right)
    drawQrCode(ctx, W - 145, H - 215, 110, t.border, t.surface);
    ctx.fillStyle = t.border;
    ctx.font = "bold 10px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("SCAN VERIFY", W - 90, H - 95);

    // 5. Bottom Decorative Footer Bar
    ctx.fillStyle = t.border;
    ctx.fillRect(0, H - 55, W, 55);

    ctx.fillStyle = t.surface;
    ctx.font = "bold 20px 'Space Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("STATUS: VERIFIED BUILDER", 40, H - 20);

    ctx.fillStyle = t.secondary;
    ctx.textAlign = "right";
    ctx.fillText("4 DAYS // AI x CRYPTO", W - 160, H - 20);

    // Accent stripes
    ctx.fillStyle = t.primary;
    ctx.fillRect(W - 60, H - 55, 20, 55);
    ctx.fillStyle = t.secondary;
    ctx.fillRect(W - 35, H - 55, 20, 55);
  };

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      if (format === "PFP_FRAME") {
        drawPfpFrame(ctx, img);
      } else {
        drawBuilderId(ctx, img);
      }
    };
  }, [imageSrc, format, theme, filter, sticker, zoom, panX, panY, builderName, stackRole, bio]);

  const handleDownload = () => {
    playSound("click", soundEnabled);
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hh-goa-2026-${format.toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("IMAGE DOWNLOADED SUCCESSFULLY!");
      }
    }, "image/png");
  };

  const handleShare = async () => {
    playSound("share", soundEnabled);
    if (!imageSrc || !canvasRef.current) {
      alert("Please upload a photo first to generate your badge!");
      return;
    }

    setIsUploading(true);
    const shareWindow = window.open("about:blank", "_blank");

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setIsUploading(false);
        if (shareWindow) shareWindow.close();
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, `hh-goa-2026-${format.toLowerCase()}.png`);
      formData.append("format", format);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        const baseUrl = window.location.origin;
        const builderUrl = `${baseUrl}/builder/${data.id}`;
        const text = encodeURIComponent(
          `I'm building at Hacker House Goa 2026 as a ${computedClass}. Less noise. More signal. #FrameInGoa`
        );
        const twitterIntent = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(builderUrl)}`;

        if (shareWindow && !shareWindow.closed) {
          shareWindow.location.href = twitterIntent;
        } else {
          window.location.href = twitterIntent;
        }
      } catch (error) {
        console.error("Failed to share:", error);
        if (shareWindow) shareWindow.close();
        alert("Failed to upload image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }, "image/png");
  };

  const handleCopyLink = () => {
    playSound("click", soundEnabled);
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showToast("LINK COPIED TO CLIPBOARD!");
  };

  const handleCopyMarkdown = () => {
    playSound("click", soundEnabled);
    const url = window.location.href;
    const markdown = `[![Hacker House Goa 2026 Badge](${url}/favicon.ico)](${url})`;
    navigator.clipboard.writeText(markdown);
    showToast("GITHUB MARKDOWN EMBED COPIED!");
  };

  const handleArchiveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    playSound("click", soundEnabled);
    setActiveModal("ARCHIVE");
    setLoadingArchive(true);
    try {
      const res = await fetch("/api/archive");
      if (res.ok) {
        const data = await res.json();
        setArchiveItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load archive", err);
    } finally {
      setLoadingArchive(false);
    }
  };

  const handleManifestoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    playSound("click", soundEnabled);
    setActiveModal("MANIFESTO");
  };

  return (
    <div style={{ backgroundColor: currentTheme.bg, color: currentTheme.surface }} className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#FF007F] text-white font-mono text-xs md:text-sm font-bold px-6 py-3 border-2 border-black shadow-[4px_4px_0_0_#000] animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Global Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay">
        <svg height="100%" width="100%">
          <filter id="noiseFilter">
            <feTurbulence baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" type="fractalNoise" />
          </filter>
          <rect filter="url(#noiseFilter)" height="100%" width="100%" />
        </svg>
      </div>

      {/* Header Bar */}
      <header
        style={{ backgroundColor: currentTheme.headerBg }}
        className="border-b border-white/20 flex justify-between items-center w-full px-4 md:px-16 py-4 sticky top-0 z-40"
      >
        <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-wider flex items-center gap-3">
          <span>HH GOA 2026</span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-xs font-mono bg-white/10 px-2 py-1 border border-white/30 hover:bg-white/20 transition-colors"
            title="Toggle Sound FX"
          >
            {soundEnabled ? "SFX: ON" : "SFX: OFF"}
          </button>
        </div>
        <nav className="flex gap-4 md:gap-6 font-[family-name:var(--font-space-mono)] text-xs md:text-sm uppercase">
          <a
            onClick={(e) => {
              e.preventDefault();
              previewRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="hover:text-[#FF007F] transition-colors cursor-pointer"
            href="#live-preview"
          >
            Live_Preview
          </a>
          <a onClick={handleArchiveClick} className="hover:text-[#FF007F] transition-colors cursor-pointer" href="#archive">
            Archive
          </a>
          <a onClick={handleManifestoClick} className="hover:text-[#FF007F] transition-colors cursor-pointer" href="#manifesto">
            Manifesto
          </a>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-6 md:py-8 px-3 md:px-4 relative z-10">
        <div
          style={{ backgroundColor: currentTheme.surface, color: currentTheme.border, borderColor: currentTheme.border }}
          className="w-full max-w-5xl relative border-4 p-4 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.4)] transition-colors duration-300"
        >
          {/* Decorative Corner Pins */}
          <div className="absolute top-4 left-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#000]"></div>
          <div className="absolute top-4 right-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#000]"></div>
          <div className="absolute bottom-4 left-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#000]"></div>
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#000]"></div>

          {/* Status Badge */}
          <div className="absolute top-6 right-[-10px] transform bg-black text-white font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-widest px-4 py-1 border border-gray-800 shadow-[4px_4px_0_0_#FF007F] rotate-3 z-20">
            ADVANCED ENGINE // 16:9 + QR
          </div>

          {/* Title Header */}
          <div style={{ borderColor: currentTheme.border }} className="mb-6 md:mb-8 border-b-2 pb-4 mt-2">
            <h1 style={{ color: currentTheme.border }} className="font-[family-name:var(--font-playfair)] text-3xl md:text-6xl uppercase tracking-tighter font-black">
              Identity Generator
            </h1>
            <p className="font-[family-name:var(--font-space-mono)] text-sm md:text-lg opacity-90 mt-2 font-bold">
              Generate your official Hacker House Goa 2026 PFP Frame or Builder ID Card with interactive controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Controls Left Column */}
            <div className="flex flex-col gap-6">
              {/* Format Switcher */}
              <div style={{ borderColor: currentTheme.border }} className="flex bg-white border-2 font-[family-name:var(--font-space-mono)] font-bold text-xs md:text-sm overflow-hidden">
                <button
                  onClick={() => {
                    playSound("click", soundEnabled);
                    setFormat("PFP_FRAME");
                  }}
                  style={{
                    backgroundColor: format === "PFP_FRAME" ? currentTheme.border : "#FFFFFF",
                    color: format === "PFP_FRAME" ? currentTheme.surface : currentTheme.border,
                  }}
                  className="flex-1 py-3 px-2 uppercase text-center transition-all"
                >
                  PFP Frame (1:1)
                </button>
                <button
                  onClick={() => {
                    playSound("click", soundEnabled);
                    setFormat("BUILDER_ID");
                  }}
                  style={{
                    backgroundColor: format === "BUILDER_ID" ? currentTheme.border : "#FFFFFF",
                    color: format === "BUILDER_ID" ? currentTheme.surface : currentTheme.border,
                    borderLeftColor: currentTheme.border,
                  }}
                  className="flex-1 py-3 px-2 uppercase text-center transition-all border-l-2"
                >
                  Builder ID (16:9)
                </button>
              </div>

              {/* Theme Switcher Selector */}
              <div className="flex flex-col gap-1 font-mono text-xs">
                <label className="font-bold uppercase opacity-80">SELECT THEME PALETTE //&gt;</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(THEMES) as ThemeKey[]).map((tKey) => (
                    <button
                      key={tKey}
                      onClick={() => {
                        playSound("theme", soundEnabled);
                        setTheme(tKey);
                      }}
                      style={{
                        borderColor: currentTheme.border,
                        backgroundColor: theme === tKey ? currentTheme.border : "#FFFFFF",
                        color: theme === tKey ? currentTheme.surface : currentTheme.border,
                      }}
                      className="border-2 py-2 px-3 text-left font-bold transition-all text-[11px]"
                    >
                      {THEMES[tKey].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload Box */}
              <label style={{ borderColor: currentTheme.border }} className="bg-white border-2 p-3 pb-8 shadow-[6px_6px_0_0_#FF007F] rotate-1 hover:rotate-0 transition-transform cursor-pointer group relative w-full h-48 mx-auto flex flex-col items-center justify-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-yellow-100/80 -rotate-2 shadow-sm border border-yellow-200/50 z-10 text-[10px] font-mono text-center flex items-center justify-center font-bold text-gray-700">
                  FILE_INGEST
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={handleImageUpload}
                />
                <div style={{ borderColor: currentTheme.border }} className="w-full h-full border-2 border-dashed flex flex-col items-center justify-center bg-gray-50/50 group-hover:bg-black/5 transition-colors p-4">
                  {isConvertingHeic ? (
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-[#FF007F] border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="font-mono text-xs font-bold">DECODING HEIC VIA WORKER...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 mb-1 text-current opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="font-[family-name:var(--font-space-mono)] text-xs font-bold text-center">
                        {imageSrc ? "CHANGE PHOTO" : "UPLOAD PHOTO (JPG, PNG, HEIC)"}
                      </span>
                      <span className="font-[family-name:var(--font-space-mono)] text-[10px] opacity-60 mt-1 text-center">
                        Supports iOS HEIC offloaded to Web Worker
                      </span>
                    </>
                  )}
                </div>
              </label>

              {/* Photo Filter & Zoom/Pan Adjustment Panel */}
              {imageSrc && (
                <div style={{ borderColor: currentTheme.border }} className="bg-white p-4 border-2 shadow-[4px_4px_0_0_#FFCC00] flex flex-col gap-3 font-mono text-xs">
                  <div className="font-bold uppercase border-b pb-1">PHOTO ADJUSTMENTS & FILTERS //</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">FILTER:</label>
                      <select
                        value={filter}
                        onChange={(e) => {
                          playSound("click", soundEnabled);
                          setFilter(e.target.value as FilterKey);
                        }}
                        style={{ borderColor: currentTheme.border }}
                        className="w-full bg-gray-50 border-2 p-1.5 font-bold"
                      >
                        <option value="none">Normal</option>
                        <option value="cyberpunk">Cyberpunk Glow</option>
                        <option value="mono">Mono Cyber</option>
                        <option value="warm">Goa Warmth</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold mb-1">STICKER SEAL:</label>
                      <select
                        value={sticker}
                        onChange={(e) => {
                          playSound("click", soundEnabled);
                          setSticker(e.target.value as StickerKey);
                        }}
                        style={{ borderColor: currentTheme.border }}
                        className="w-full bg-gray-50 border-2 p-1.5 font-bold"
                      >
                        <option value="SOLANA_DEV">Solana Dev</option>
                        <option value="AI_ARCHITECT">AI Architect</option>
                        <option value="ZK_PROOF">ZK Proof</option>
                        <option value="HH_GOA_VIP">HH Goa VIP</option>
                      </select>
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="flex flex-col gap-2 mt-1">
                    <div>
                      <div className="flex justify-between font-bold">
                        <span>ZOOM SCALE:</span>
                        <span>{zoom.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="2.5"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-[#FF007F]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between font-bold">
                          <span>PAN X:</span>
                          <span>{panX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          step="10"
                          value={panX}
                          onChange={(e) => setPanX(parseInt(e.target.value))}
                          className="w-full accent-[#FF007F]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between font-bold">
                          <span>PAN Y:</span>
                          <span>{panY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          step="10"
                          value={panY}
                          onChange={(e) => setPanY(parseInt(e.target.value))}
                          className="w-full accent-[#FF007F]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Builder Inputs */}
              {format === "BUILDER_ID" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col relative group">
                    <div className="absolute inset-0 bg-[#FF007F] translate-x-1 translate-y-1 z-0"></div>
                    <label style={{ backgroundColor: currentTheme.surface, color: currentTheme.border }} className="font-[family-name:var(--font-space-mono)] text-xs mb-1 uppercase font-bold relative z-10 inline-block px-1 w-max">
                      BUILDER_NAME //&gt;
                    </label>
                    <input
                      style={{ borderColor: currentTheme.border, color: currentTheme.border }}
                      className="bg-white border-2 p-3 font-[family-name:var(--font-space-mono)] text-sm focus:ring-0 focus:outline-none relative z-10 font-bold"
                      placeholder="Enter handle..."
                      value={builderName}
                      onChange={(e) => setBuilderName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col relative group">
                    <div className="absolute inset-0 bg-[#FFCC00] translate-x-1 translate-y-1 z-0"></div>
                    <label style={{ backgroundColor: currentTheme.surface, color: currentTheme.border }} className="font-[family-name:var(--font-space-mono)] text-xs mb-1 uppercase font-bold relative z-10 inline-block px-1 w-max">
                      STACK_ROLE //&gt;
                    </label>
                    <input
                      style={{ borderColor: currentTheme.border, color: currentTheme.border }}
                      className="bg-white border-2 p-3 font-[family-name:var(--font-space-mono)] text-sm focus:ring-0 focus:outline-none relative z-10 font-bold"
                      placeholder="Frontend, Rust, Smart Contracts..."
                      value={stackRole}
                      onChange={(e) => setStackRole(e.target.value)}
                    />
                  </div>

                  {/* Computed Class Banner */}
                  <div style={{ backgroundColor: currentTheme.border, color: currentTheme.surface, borderColor: currentTheme.border }} className="p-3 border-2 font-mono text-xs shadow-[4px_4px_0_0_#FF007F]">
                    <div style={{ color: currentTheme.secondary }} className="text-[10px] font-bold">ALGORITHMIC BUILDER CLASS:</div>
                    <div className="font-bold text-sm tracking-wide mt-1">{computedClass}</div>
                  </div>

                  <div className="flex flex-col relative group">
                    <div className="absolute inset-0 bg-[#0B5C36] translate-x-1 translate-y-1 z-0"></div>
                    <label style={{ backgroundColor: currentTheme.surface, color: currentTheme.border }} className="font-[family-name:var(--font-space-mono)] text-xs mb-1 uppercase font-bold relative z-10 inline-block px-1 w-max">
                      MOTTO / QUOTE //&gt;
                    </label>
                    <textarea
                      style={{ borderColor: currentTheme.border, color: currentTheme.border }}
                      className="bg-white border-2 p-3 font-[family-name:var(--font-space-mono)] text-sm focus:ring-0 focus:outline-none relative z-10 font-bold resize-none h-20"
                      placeholder="Less noise. More signal..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column — Live Canvas Preview & Quick Copy Utilities */}
            <div ref={previewRef} id="live-preview" className="flex flex-col h-full items-center">
              <div style={{ borderColor: currentTheme.border, color: currentTheme.border }} className="font-[family-name:var(--font-space-mono)] w-full text-xs mb-2 uppercase border-b-2 pb-1 font-bold tracking-wider flex items-center justify-between">
                <span>LIVE_CANVAS_MIRROR ({format === "PFP_FRAME" ? "1200x1200" : "1200x675"}) //</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>

              <div style={{ borderColor: currentTheme.border }} className="bg-white border-2 p-3 flex items-center justify-center shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] w-full">
                <div className="w-full relative shadow-[6px_6px_0_0_#FF007F]">
                  {imageSrc ? (
                    <canvas ref={canvasRef} style={{ borderColor: currentTheme.border }} className="w-full h-auto object-contain bg-gray-100 border" />
                  ) : (
                    <div style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.border }} className={`w-full border-2 border-dashed flex flex-col items-center justify-center font-[family-name:var(--font-space-mono)] font-bold text-center p-6 ${format === "PFP_FRAME" ? "aspect-square" : "aspect-[16/9]"}`}>
                      <svg className="w-8 h-8 mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      UPLOAD AN IMAGE TO GENERATE REAL-TIME PREVIEW
                    </div>
                  )}
                </div>
              </div>

              {/* Utility Tools: Copy Link & Copy Markdown */}
              <div className="w-full flex gap-3 mt-4 font-mono text-xs">
                <button
                  onClick={handleCopyLink}
                  style={{ borderColor: currentTheme.border, color: currentTheme.border }}
                  className="flex-1 bg-white border-2 p-2.5 font-bold shadow-[2px_2px_0_0_#000] hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>COPY LINK</span>
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  style={{ borderColor: currentTheme.border, color: currentTheme.border }}
                  className="flex-1 bg-white border-2 p-2.5 font-bold shadow-[2px_2px_0_0_#000] hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>COPY GITHUB MARKDOWN</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ borderColor: currentTheme.border }} className="mt-8 md:mt-12 flex flex-col md:flex-row gap-4 md:gap-6 border-t-2 pt-6 md:pt-8 justify-end font-[family-name:var(--font-space-mono)] font-bold text-sm">
            <button
              onClick={handleDownload}
              style={{ borderColor: currentTheme.border, color: currentTheme.border }}
              className="bg-white border-2 uppercase py-3 px-8 shadow-[4px_4px_0_0_#FFCC00] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FFCC00] transition-all flex items-center justify-center gap-2 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none min-h-[48px]"
            >
              DOWNLOAD IMAGE (BLOB)
            </button>
            <button
              onClick={handleShare}
              disabled={isUploading}
              style={{ borderColor: currentTheme.border }}
              className={`bg-[#FF007F] text-white uppercase py-3 px-8 border-2 shadow-[6px_6px_0_0_#000] transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                isUploading
                  ? "opacity-60 cursor-not-allowed"
                  : "active:translate-y-[6px] active:translate-x-[6px] active:shadow-none hover:shadow-[8px_8px_0_0_#000] hover:-translate-y-1 hover:-translate-x-1"
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>UPLOADING & GENERATING LINK...</span>
                </>
              ) : (
                "SHARE TO X (#FrameInGoa)"
              )}
            </button>
          </div>
        </div>
      </main>

      {/* MODAL: ARCHIVE */}
      {activeModal === "ARCHIVE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.border }} className="border-4 p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-[12px_12px_0_0_#FF007F] relative">
            <button
              onClick={() => {
                playSound("click", soundEnabled);
                setActiveModal(null);
              }}
              style={{ borderColor: currentTheme.border }}
              className="absolute top-4 right-4 bg-[#FF007F] text-white font-mono font-bold text-sm px-3 py-1 border-2 hover:bg-black transition-colors"
            >
              CLOSE [X]
            </button>

            <h2 style={{ borderColor: currentTheme.border }} className="font-[family-name:var(--font-playfair)] text-3xl font-black uppercase border-b-2 pb-2 mb-6">
              COMMUNITY ARCHIVE (72H TTL) //
            </h2>

            {loadingArchive ? (
              <div className="text-center font-mono py-12 font-bold">LOADING ARCHIVE...</div>
            ) : archiveItems.length === 0 ? (
              <div className="text-center font-mono py-12 opacity-70 font-bold">
                NO ACTIVE BADGES IN THE PAST 72 HOURS. BE THE FIRST!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {archiveItems.map((item) => (
                  <div key={item.id} style={{ borderColor: currentTheme.border }} className="border-2 bg-white p-3 shadow-[4px_4px_0_0_#000]">
                    <a href={`/builder/${item.id}`} target="_blank" rel="noreferrer">
                      <img src={item.image_url} alt="Badge" style={{ borderColor: currentTheme.border }} className="w-full h-auto hover:opacity-90 transition-opacity border" />
                    </a>
                    <div style={{ color: currentTheme.border }} className="mt-2 text-[10px] font-mono font-bold flex justify-between">
                      <span>FORMAT: {item.format_type}</span>
                      <span>CREATED: {new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: MANIFESTO */}
      {activeModal === "MANIFESTO" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border, color: currentTheme.border }} className="border-4 p-8 max-w-2xl w-full shadow-[12px_12px_0_0_#FFCC00] relative">
            <button
              onClick={() => {
                playSound("click", soundEnabled);
                setActiveModal(null);
              }}
              style={{ borderColor: currentTheme.border }}
              className="absolute top-4 right-4 bg-[#FF007F] text-white font-mono font-bold text-sm px-3 py-1 border-2 hover:bg-black transition-colors"
            >
              CLOSE [X]
            </button>

            <h2 style={{ borderColor: currentTheme.border }} className="font-[family-name:var(--font-playfair)] text-4xl font-black uppercase border-b-2 pb-3 mb-6">
              THE HH GOA MANIFESTO
            </h2>

            <div className="font-[family-name:var(--font-space-mono)] text-sm space-y-4 font-bold leading-relaxed">
              <p style={{ backgroundColor: currentTheme.border, color: currentTheme.surface }} className="p-3">
                // 4 DAYS. AI x CRYPTO. MULTICHAIN.
              </p>
              <p>
                1. <strong>LESS NOISE. MORE SIGNAL.</strong> We don't build vaporware or pitch decks. We build working software that pushes technology forward.
              </p>
              <p>
                2. <strong>FEARLESS WRITING & BUILDING.</strong> True innovation happens where brutal honesty meets relentless execution.
              </p>
              <p>
                3. <strong>GOA IS THE GROUND ZERO.</strong> Under the palms and by the ocean, top builders converge to hack the future.
              </p>
            </div>

            <div style={{ borderColor: currentTheme.border }} className="mt-8 border-t-2 pt-4 flex justify-between items-center font-mono text-xs font-bold">
              <span>HACKER HOUSE GOA 2026</span>
              <span className="bg-[#FFCC00] text-black px-2 py-1 border border-black">EST. 2026</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
