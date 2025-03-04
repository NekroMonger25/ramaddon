# Usa l'immagine Alpine di Node.js
FROM node:20-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Copia solo i file delle dipendenze prima (per caching ottimizzato)
# COPY package.json package-lock.json ./

COPY package.json ./
RUN npm install --omit=dev

# Installa le dipendenze
RUN npm install

# Copia tutto il codice sorgente nella directory di lavoro
COPY . .

# Esponi la porta usata dall'addon
EXPOSE 7000

# Avvia il server Stremio
CMD ["node", "main.js"]
