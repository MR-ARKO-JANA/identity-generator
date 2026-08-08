# Render Deployment Guide

This repository is optimized for deployment on [Render](https://render.com).

## Option 1: Render Blueprint (Automatic via `render.yaml`)

1. Push code to your GitHub repository: `https://github.com/MR-ARKO-JANA/identity-generator.git`.
2. Go to [Render Dashboard](https://dashboard.render.com/) -> **New** -> **Blueprint**.
3. Connect your repository.
4. Render will automatically detect `render.yaml` and launch the service:
   - **Environment**: Node 20.11.0
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`

## Option 2: Render Manual Web Service

1. Create a **New Web Service** on Render.
2. Select repository `MR-ARKO-JANA/identity-generator`.
3. Set **Runtime**: `Node`.
4. Set **Build Command**: `npm ci && npm run build`.
5. Set **Start Command**: `npm run start`.
6. Add Environment Variable: `RENDER` = `true`.

## Option 3: Render Docker Service

Render automatically detects your [Dockerfile](Dockerfile) if you choose **Docker** runtime:
1. Create a **New Web Service** on Render.
2. Set Runtime: `Docker`.
3. Render builds the multi-stage Docker container and exposes port `8080`.
