# Hacker House Goa 2026 — Identity Generator

An interactive identity badge and PFP frame engine built for **Hacker House Goa 2026**. Designed for high-contrast brutalist aesthetics, custom canvas rendering, QR verification stamps, multi-theme customization, and client-side web worker offloading.

---

## ⚡ Features

- **PFP Frame (1:1) & Builder ID (16:9)**: Dynamic aspect ratios optimized for avatar social media frames and landscape developer badges.
- **Real-Time Interactive Canvas**: Multi-theme palette engine (*HH Goa Cypherpunk*, *Goa Sunset*, *Matrix Terminal*, *Solana Multichain*).
- **Image Adjustments**: Precision Zoom and Pan controls with touch-drag support for mobile viewports.
- **Canvas Filters**: Live filters (*Cyberpunk*, *Monochrome*, *Warm Sepia*).
- **Web Worker Offloading**: Asynchronous iOS HEIC / HEIF image conversion to keep the main UI thread responsive.
- **Audio SFX Synthesizer**: Web Audio API sound effects for interactive user controls.
- **QR Code Generator**: Algorithmic QR stamp embedded directly on generated identity cards.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- npm / yarn / pnpm

### Local Development

```bash
# Install dependencies
npm ci

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Production Build & Deployment

```bash
# Create production build
npm run build

# Start production server
npm run start
```

### Deployment Options

- **Render**: Configured for Render Web Services via `render.yaml`. See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md).
- **GitHub Pages**: Static export pipeline configured via `.github/workflows/deploy.yml`.
- **Vercel & Netlify**: Pre-configured via `vercel.json` and `netlify.toml`.
