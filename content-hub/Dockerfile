FROM node:20-slim

# Install system dependencies for Chromium + Python/FFmpeg for transcription
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libglib2.0-0 libx11-xcb1 libxcb1 libxext6 libx11-6 \
    fonts-liberation libappindicator3-1 xdg-utils \
    python3 python3-pip python3-venv ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp and faster-whisper (base model for PT-BR, ~150MB RAM)
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp faster-whisper

# Pre-download whisper base model so it's cached in the image
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

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
ENV WHISPER_MODEL=base
EXPOSE ${PORT:-3001}

CMD ["npm", "start"]
