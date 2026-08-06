"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { getBuilderClass } from "@/lib/builderClass";

type Format = "PFP_FRAME" | "BUILDER_ID";

interface ArchiveItem {
  id: string;
  image_url: string;
  format_type: string;
  created_at: string;
}

export default function Home() {
  const [format, setFormat] = useState<Format>("BUILDER_ID");
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

  // Calculate algorithmic builder class
  const computedClass = getBuilderClass(builderName, stackRole);

  // HEIC & Image Upload Handler with Web Worker Offloading
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHeic =
      file.type.toLowerCase().includes("heic") ||
      file.type.toLowerCase().includes("heif") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
      setIsConvertingHeic(true);
      try {
        // Attempt using Web Worker for HEIC conversion off main thread
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

  const handleLivePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    previewRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleArchiveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
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
    setActiveModal("MANIFESTO");
  };

  // ─── PFP FRAME Renderer (1200 x 1200 px - 1:1 Aspect Ratio) ──────────────
  const drawPfpFrame = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    const size = 1200;
    const canvas = canvasRef.current!;
    canvas.width = size;
    canvas.height = size;

    // 1. Fill cream background
    ctx.fillStyle = "#FDF8E4";
    ctx.fillRect(0, 0, size, size);

    // 2. Outer border
    ctx.lineWidth = 20;
    ctx.strokeStyle = "#0B5C36";
    ctx.strokeRect(0, 0, size, size);

    // 3. Draw the uploaded photo, center-cropped into a circle
    const photoRadius = 420;
    const cx = size / 2;
    const cy = size / 2 - 20;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius, 0, Math.PI * 2);
    ctx.clip();

    // Center-weighted object-fit: cover scale calculation
    const scale = Math.max((photoRadius * 2) / img.width, (photoRadius * 2) / img.height);
    const dx = cx - (img.width * scale) / 2;
    const dy = cy - (img.height * scale) / 2;
    ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
    ctx.restore();

    // 4. Branded ring frame
    ctx.lineWidth = 24;
    ctx.strokeStyle = "#FF007F";
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Outer accent ring
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#FFCC00";
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius + 20, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dark green border
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#0B5C36";
    ctx.beginPath();
    ctx.arc(cx, cy, photoRadius - 12, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Corner brand marks
    ctx.strokeStyle = "#0B5C36";
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
    ctx.fillStyle = "#0B5C36";
    ctx.font = "bold 42px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("HACKER HOUSE GOA", cx, 85);

    // 7. Footer text
    ctx.fillStyle = "#0B5C36";
    ctx.font = "bold 52px 'Space Mono', monospace";
    ctx.fillText("2 0 2 6", cx, size - 50);

    // 8. Brand dots
    const dotY = size - 110;
    [
      { x: cx - 160, color: "#FF007F" },
      { x: cx, color: "#FFCC00" },
      { x: cx + 160, color: "#0B5C36" },
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

    // 1. Base Card Background (Cream #FDF8E4)
    ctx.fillStyle = "#FDF8E4";
    ctx.fillRect(0, 0, W, H);

    // Outer Dark Green Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#0B5C36";
    ctx.strokeRect(0, 0, W, H);

    // Inner Accent Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#05301C";
    ctx.strokeRect(18, 18, W - 36, H - 36);

    // Top Header Banner Stripe
    ctx.fillStyle = "#0B5C36";
    ctx.fillRect(0, 0, W, 70);

    ctx.fillStyle = "#FDF8E4";
    ctx.font = "bold 32px 'Space Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("HACKER HOUSE GOA 2026", 40, 46);

    ctx.fillStyle = "#FFCC00";
    ctx.font = "bold 20px 'Space Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("// BUILDER PASSPORT", W - 40, 44);

    // 2. Photo Container (Left Side)
    const photoBoxSize = 460;
    const photoX = 50;
    const photoY = 110;

    // Photo background placeholder
    ctx.fillStyle = "#05301C";
    ctx.fillRect(photoX - 4, photoY - 4, photoBoxSize + 8, photoBoxSize + 8);

    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoBoxSize, photoBoxSize);
    ctx.clip();

    // Center-Weighted Object-Fit Cover algorithm
    const scale = Math.max(photoBoxSize / img.width, photoBoxSize / img.height);
    const dx = photoX + (photoBoxSize - img.width * scale) / 2;
    const dy = photoY + (photoBoxSize - img.height * scale) / 2;
    ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
    ctx.restore();

    // Photo Border Overlay
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#FF007F";
    ctx.strokeRect(photoX, photoY, photoBoxSize, photoBoxSize);

    // Corner pin graphic on photo
    ctx.fillStyle = "#FFCC00";
    ctx.fillRect(photoX + 10, photoY + 10, 16, 16);

    // 3. Right Side Details Section
    const textLeft = 550;

    // Builder Name
    ctx.fillStyle = "#0B5C36";
    ctx.font = "900 56px 'Playfair Display', serif";
    ctx.textAlign = "left";
    ctx.fillText((builderName || "ANON_BUILDER").toUpperCase(), textLeft, 160);

    // Algorithmic Builder Class Tag (PDF Requirement)
    const classBadgeY = 190;
    ctx.fillStyle = "#FF007F";
    const classText = `CLASS: ${computedClass.toUpperCase()}`;
    ctx.font = "bold 22px 'Space Mono', monospace";
    const classMetrics = ctx.measureText(classText);
    const classPillW = classMetrics.width + 36;
    const classPillH = 42;

    ctx.fillRect(textLeft, classBadgeY, classPillW, classPillH);
    ctx.strokeStyle = "#0B5C36";
    ctx.lineWidth = 3;
    ctx.strokeRect(textLeft, classBadgeY, classPillW, classPillH);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(classText, textLeft + 18, classBadgeY + 28);

    // Stack / Role Pill
    const roleY = 250;
    const roleText = `STACK: ${(stackRole || "FULLSTACK").toUpperCase()}`;
    ctx.font = "bold 20px 'Space Mono', monospace";
    const roleMetrics = ctx.measureText(roleText);
    const rolePillW = roleMetrics.width + 30;
    const rolePillH = 38;

    ctx.fillStyle = "#FFCC00";
    ctx.fillRect(textLeft, roleY, rolePillW, rolePillH);
    ctx.strokeStyle = "#0B5C36";
    ctx.lineWidth = 3;
    ctx.strokeRect(textLeft, roleY, rolePillW, rolePillH);

    ctx.fillStyle = "#0B5C36";
    ctx.fillText(roleText, textLeft + 15, roleY + 26);

    // Bio / Quote Line
    ctx.fillStyle = "#05301C";
    ctx.font = "bold italic 22px 'Space Mono', monospace";

    const bioText = `"${bio || "Less Noise. More Signal."}"`;
    let currentLine = "";
    let lineY = 330;
    const maxBioWidth = 580;
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

    // 4. Bottom Decorative Footer Bar
    ctx.fillStyle = "#0B5C36";
    ctx.fillRect(0, H - 55, W, 55);

    ctx.fillStyle = "#FDF8E4";
    ctx.font = "bold 20px 'Space Mono', monospace";
    ctx.fillText("STATUS: VERIFIED BUILDER", 40, H - 20);

    ctx.fillStyle = "#FFCC00";
    ctx.fillText("4 DAYS // AI x CRYPTO // MULTICHAIN", W - 400, H - 20);

    // Bottom accent stripes
    ctx.fillStyle = "#FF007F";
    ctx.fillRect(W - 60, H - 55, 20, 55);
    ctx.fillStyle = "#FFCC00";
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
  }, [imageSrc, format, builderName, stackRole, bio]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hh-goa-2026-${format.toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  };

  const handleShare = async () => {
    if (!imageSrc || !canvasRef.current) {
      alert("Please upload a photo first to generate your badge!");
      return;
    }

    setIsUploading(true);
    // Pre-open target window to bypass browser popup blockers during async fetch
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

  return (
    <>
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
      <header className="bg-[#0B5C36] border-b border-[#FDF8E4]/20 flex justify-between items-center w-full px-4 md:px-16 py-4 sticky top-0 z-40 text-[#FDF8E4]">
        <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-wider">
          HH GOA 2026
        </div>
        <nav className="flex gap-4 md:gap-6 font-[family-name:var(--font-space-mono)] text-xs md:text-sm uppercase">
          <a onClick={handleLivePreviewClick} className="hover:text-[#FF007F] transition-colors cursor-pointer" href="#live-preview">
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
      <main className="flex-grow flex items-center justify-center py-6 md:py-8 px-3 md:px-4 relative z-10 bg-[#0B5C36]">
        {/* Main Card Container */}
        <div className="bg-[#FDF8E4] text-[#0B5C36] w-full max-w-5xl relative border-2 border-[#0B5C36] p-4 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.4)]">
          {/* Decorative Corner Pins */}
          <div className="absolute top-4 left-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#0B5C36]"></div>
          <div className="absolute top-4 right-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#0B5C36]"></div>
          <div className="absolute bottom-4 left-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#0B5C36]"></div>
          <div className="absolute bottom-4 right-4 w-3 h-3 bg-[#FF007F] rounded-full shadow-[2px_2px_0_0_#0B5C36]"></div>

          {/* Status Badge */}
          <div className="absolute top-6 right-[-10px] transform bg-black text-white font-[family-name:var(--font-space-mono)] text-[10px] uppercase tracking-widest px-4 py-1 border border-gray-800 shadow-[4px_4px_0_0_#FF007F] rotate-3 z-20">
            SYS_ONLINE // 16:9 OG READY
          </div>

          {/* Title Header */}
          <div className="mb-6 md:mb-8 border-b-2 border-[#0B5C36] pb-4 mt-2">
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-6xl text-[#0B5C36] uppercase tracking-tighter mix-blend-multiply font-black">
              Identity Generator
            </h1>
            <p className="font-[family-name:var(--font-space-mono)] text-sm md:text-lg text-[#0B5C36]/80 mt-2 font-bold">
              Generate your official Hacker House Goa 2026 PFP Frame or Builder ID Card.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Controls Left Column */}
            <div className="flex flex-col gap-6">
              {/* Format Switcher */}
              <div className="flex bg-white border-2 border-[#0B5C36] font-[family-name:var(--font-space-mono)] font-bold text-xs md:text-sm overflow-hidden">
                <button
                  onClick={() => setFormat("PFP_FRAME")}
                  className={`flex-1 py-3 px-2 uppercase text-center transition-all ${
                    format === "PFP_FRAME"
                      ? "bg-[#0B5C36] text-[#FDF8E4]"
                      : "bg-white text-[#0B5C36] hover:bg-[#0B5C36]/10"
                  }`}
                >
                  PFP Frame (1:1)
                </button>
                <button
                  onClick={() => setFormat("BUILDER_ID")}
                  className={`flex-1 py-3 px-2 uppercase text-center transition-all border-l-2 border-[#0B5C36] ${
                    format === "BUILDER_ID"
                      ? "bg-[#0B5C36] text-[#FDF8E4]"
                      : "bg-white text-[#0B5C36] hover:bg-[#0B5C36]/10"
                  }`}
                >
                  Builder ID (16:9)
                </button>
              </div>

              {/* Photo Upload Box */}
              <label className="bg-white border-2 border-[#0B5C36] p-3 pb-8 shadow-[6px_6px_0_0_#FF007F] rotate-1 hover:rotate-0 transition-transform cursor-pointer group relative w-full h-56 mx-auto flex flex-col items-center justify-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-yellow-100/80 -rotate-2 shadow-sm border border-yellow-200/50 z-10 text-[10px] font-mono text-center flex items-center justify-center font-bold text-gray-700">
                  FILE_INGEST
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={handleImageUpload}
                />
                <div className="w-full h-full border-2 border-dashed border-[#0B5C36] flex flex-col items-center justify-center bg-gray-50/50 group-hover:bg-[#0B5C36]/5 transition-colors p-4">
                  {isConvertingHeic ? (
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-[#FF007F] border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="font-mono text-xs text-[#0B5C36] font-bold">DECODING HEIC VIA WORKER...</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-3xl mb-2">📸</span>
                      <span className="font-[family-name:var(--font-space-mono)] text-xs text-[#0B5C36] font-bold text-center">
                        {imageSrc ? "CHANGE PHOTO" : "UPLOAD PHOTO (JPG, PNG, HEIC)"}
                      </span>
                      <span className="font-[family-name:var(--font-space-mono)] text-[10px] text-[#0B5C36]/60 mt-1 text-center">
                        Supports iOS HEIC offloaded to Web Worker
                      </span>
                    </>
                  )}
                </div>
              </label>

              {/* Builder Inputs */}
              {format === "BUILDER_ID" && (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex flex-col relative group">
                    <div className="absolute inset-0 bg-[#FF007F] translate-x-1 translate-y-1 z-0"></div>
                    <label className="font-[family-name:var(--font-space-mono)] text-xs text-[#0B5C36] mb-1 uppercase font-bold relative z-10 bg-[#FDF8E4] inline-block px-1 w-max">
                      BUILDER_NAME //&gt;
                    </label>
                    <input
                      className="bg-white text-[#0B5C36] border-2 border-[#0B5C36] p-3 font-[family-name:var(--font-space-mono)] text-sm focus:ring-0 focus:outline-none relative z-10 font-bold"
                      placeholder="Enter handle..."
                      value={builderName}
                      onChange={(e) => setBuilderName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col relative group">
                    <div className="absolute inset-0 bg-[#FFCC00] translate-x-1 translate-y-1 z-0"></div>
                    <label className="font-[family-name:var(--font-space-mono)] text-xs text-[#0B5C36] mb-1 uppercase font-bold relative z-10 bg-[#FDF8E4] inline-block px-1 w-max">
                      STACK_ROLE //&gt;
                    </label>
                    <input
                      className="bg-white text-[#0B5C36] border-2 border-[#0B5C36] p-3 font-[family-name:var(--font-space-mono)] text-sm focus:ring-0 focus:outline-none relative z-10 font-bold"
                      placeholder="Frontend, Rust, Smart Contracts..."
                      value={stackRole}
                      onChange={(e) => setStackRole(e.target.value)}
                    />
                  </div>

                  {/* Computed Class Banner */}
                  <div className="bg-[#0B5C36] text-[#FDF8E4] p-3 border-2 border-[#0B5C36] font-mono text-xs shadow-[4px_4px_0_0_#FF007F]">
                    <div className="text-[10px] text-[#FFCC00] font-bold">ALGORITHMIC BUILDER CLASS:</div>
                    <div className="font-bold text-sm tracking-wide mt-1">{computedClass}</div>
                  </div>

                  <div className="flex flex-col relative group">
                    <div className="absolute inset-0 bg-[#0B5C36] translate-x-1 translate-y-1 z-0"></div>
                    <label className="font-[family-name:var(--font-space-mono)] text-xs text-[#0B5C36] mb-1 uppercase font-bold relative z-10 bg-[#FDF8E4] inline-block px-1 w-max">
                      MOTTO / QUOTE //&gt;
                    </label>
                    <textarea
                      className="bg-white text-[#0B5C36] border-2 border-[#0B5C36] p-3 font-[family-name:var(--font-space-mono)] text-sm focus:ring-0 focus:outline-none relative z-10 font-bold resize-none h-20"
                      placeholder="Less noise. More signal..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column — Live Preview */}
            <div ref={previewRef} id="live-preview" className="flex flex-col h-full items-center">
              <div className="font-[family-name:var(--font-space-mono)] w-full text-xs text-[#0B5C36] mb-2 uppercase border-b-2 border-[#0B5C36] pb-1 font-bold tracking-wider flex items-center justify-between">
                <span>LIVE_CANVAS_MIRROR ({format === "PFP_FRAME" ? "1200x1200" : "1200x675"}) //</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>

              <div className="bg-white border-2 border-[#0B5C36] p-3 flex items-center justify-center shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] w-full">
                <div className="w-full relative shadow-[6px_6px_0_0_#FF007F]">
                  {imageSrc ? (
                    <canvas ref={canvasRef} className="w-full h-auto object-contain bg-gray-100 border border-[#0B5C36]" />
                  ) : (
                    <div className={`w-full bg-[#FDF8E4] border-2 border-dashed border-[#0B5C36] flex flex-col items-center justify-center text-[#0B5C36] font-[family-name:var(--font-space-mono)] font-bold text-center p-6 ${format === "PFP_FRAME" ? "aspect-square" : "aspect-[16/9]"}`}>
                      <span className="text-2xl mb-2">🖼️</span>
                      UPLOAD AN IMAGE TO GENERATE REAL-TIME PREVIEW
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 md:mt-12 flex flex-col md:flex-row gap-4 md:gap-6 border-t-2 border-[#0B5C36] pt-6 md:pt-8 justify-end font-[family-name:var(--font-space-mono)] font-bold text-sm">
            <button
              onClick={handleDownload}
              className="bg-white border-2 border-[#0B5C36] text-[#0B5C36] uppercase py-3 px-8 shadow-[4px_4px_0_0_#FFCC00] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#FFCC00] transition-all flex items-center justify-center gap-2 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none min-h-[48px]"
            >
              DOWNLOAD IMAGE (BLOB)
            </button>
            <button
              onClick={handleShare}
              disabled={isUploading}
              className={`bg-[#FF007F] text-white uppercase py-3 px-8 border-2 border-[#0B5C36] shadow-[6px_6px_0_0_#0B5C36] transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                isUploading
                  ? "opacity-60 cursor-not-allowed"
                  : "active:translate-y-[6px] active:translate-x-[6px] active:shadow-none hover:shadow-[8px_8px_0_0_#0B5C36] hover:-translate-y-1 hover:-translate-x-1"
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
          <div className="bg-[#FDF8E4] border-4 border-[#0B5C36] p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-[12px_12px_0_0_#FF007F] relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 bg-[#FF007F] text-white font-mono font-bold text-sm px-3 py-1 border-2 border-[#0B5C36] hover:bg-black transition-colors"
            >
              CLOSE [X]
            </button>

            <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-black text-[#0B5C36] uppercase border-b-2 border-[#0B5C36] pb-2 mb-6">
              COMMUNITY ARCHIVE (72H TTL) //
            </h2>

            {loadingArchive ? (
              <div className="text-center font-mono py-12 text-[#0B5C36] font-bold">LOADING ARCHIVE...</div>
            ) : archiveItems.length === 0 ? (
              <div className="text-center font-mono py-12 text-[#0B5C36]/70 font-bold">
                NO ACTIVE BADGES IN THE PAST 72 HOURS. BE THE FIRST!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {archiveItems.map((item) => (
                  <div key={item.id} className="border-2 border-[#0B5C36] bg-white p-3 shadow-[4px_4px_0_0_#0B5C36]">
                    <a href={`/builder/${item.id}`} target="_blank" rel="noreferrer">
                      <img src={item.image_url} alt="Badge" className="w-full h-auto hover:opacity-90 transition-opacity border border-[#0B5C36]" />
                    </a>
                    <div className="mt-2 text-[10px] font-mono font-bold text-[#0B5C36] flex justify-between">
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
          <div className="bg-[#FDF8E4] border-4 border-[#0B5C36] p-8 max-w-2xl w-full shadow-[12px_12px_0_0_#FFCC00] relative text-[#0B5C36]">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 bg-[#FF007F] text-white font-mono font-bold text-sm px-3 py-1 border-2 border-[#0B5C36] hover:bg-black transition-colors"
            >
              CLOSE [X]
            </button>

            <h2 className="font-[family-name:var(--font-playfair)] text-4xl font-black uppercase border-b-2 border-[#0B5C36] pb-3 mb-6">
              THE HH GOA MANIFESTO
            </h2>

            <div className="font-[family-name:var(--font-space-mono)] text-sm space-y-4 font-bold leading-relaxed">
              <p className="bg-[#0B5C36] text-[#FDF8E4] p-3">
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

            <div className="mt-8 border-t-2 border-[#0B5C36] pt-4 flex justify-between items-center font-mono text-xs font-bold">
              <span>HACKER HOUSE GOA 2026</span>
              <span className="bg-[#FFCC00] text-black px-2 py-1 border border-black">EST. 2026</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
