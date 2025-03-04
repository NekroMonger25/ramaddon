# Usa un'immagine base di Node.js più leggera
FROM node:18-bullseye-slim

# Installa dipendenze necessarie per Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file del progetto
COPY package.json package-lock.json ./

# Installa le dipendenze senza Puppeteer (lo installeremo manualmente)
RUN npm install --omit=dev

# Copia il codice sorgente
COPY . .

# Installa Puppeteer e Chromium manualmente
RUN npm install puppeteer-extra puppeteer-extra-plugin-stealth && \
    npx puppeteer browsers install chrome

# Espone la porta su cui gira l'addon
EXPOSE 7000

# Avvia l'addon Stremio
CMD ["node", "main.js"]