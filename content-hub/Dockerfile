FROM node:20-slim

# Install system dependencies for Chromium + yt-dlp for YouTube captions
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libglib2.0-0 libx11-xcb1 libxcb1 libxext6 libx11-6 \
    fonts-liberation libappindicator3-1 xdg-utils \
    python3 python3-pip ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp only (lightweight, for YouTube auto-captions). Whisper runs locally, not on Railway.
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json ./
RUN npm ci

# Install Playwright Chromium
RUN npx playwright install chromium

# Copy source and build
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE ${PORT:-3001}

CMD ["npm", "start"]
