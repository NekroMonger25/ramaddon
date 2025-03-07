import axios from 'axios';
import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';
import { getEpisodes } from './streams.js';

// Lista di User-Agent (mantenuta come prima)
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.3',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15'
];

// Funzione per ottenere headers casuali (mantenuta come prima)
function getRandomHeaders() {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return {
        'User-Agent': userAgent,
        'Referer': 'https://ramaorientalfansub.tv/paese/corea-del-sud/',
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

// Istanza di Axios con headers casuali (mantenuta come prima)
const axiosInstance = axios.create({
    headers: getRandomHeaders()
});

export { axiosInstance, axios, cloudscraper, cheerio };

// Funzione per effettuare richieste con Cloudscraper
async function fetchWithCloudscraper(url) {
    try {
        const data = await cloudscraper.get({
            uri: url,
            headers: getRandomHeaders() // Aggiungi headers casuali anche qui
        });
        return data;
    } catch (error) {
        // console.error("Errore con Cloudscraper:", error); // Rimosso console.error
        return null;
    }
}

async function getMeta(id) {
    const meta = { id, type: 'series', name: '', poster: '', episodes: [] };
    const cleanId = id.replace(/,/g, '').replace(/\s+/g, '-').toLowerCase();
    const baseId = cleanId.replace(/-\d{4}$/, '');
    const seriesLink = `https://ramaorientalfansub.tv/drama/${baseId}/`;

    try {
        const data = await fetchWithCloudscraper(seriesLink);
        if (!data) {
            // console.warn(`Nessun dato ricevuto per ${seriesLink}`); // Rimosso console.warn
            return { meta };
        }

        const $ = cheerio.load(data);
        meta.name = $('a.text-accent').text().trim();
        meta.poster = $('img.wp-post-image').attr('src');
        let description = $('div.font-light > div:nth-child(1)').text().trim();

        if (meta.extra && meta.extra.tag) {
            description += ` [${meta.extra.tag.toUpperCase()}]`;
        }

        meta.description = description;
        // console.log('Dettagli serie caricati:', meta.name, meta.description); // Rimosso console.log
        // console.log('Chiamata a getEpisodes con URL:', seriesLink); // Rimosso console.log
        meta.episodes = await getEpisodes(seriesLink, $); // Passa l'oggetto cheerio
        // console.log('Episodi trovati:', meta.episodes); // Rimosso console.log
    } catch (error) {
        // console.error('Errore nel caricamento dei dettagli della serie:', error); // Rimosso console.error
    }

    // console.log('Meta finale:', meta); // Rimosso console.log
    return { meta };
}

export { getMeta };
