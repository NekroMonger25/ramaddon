import axios from 'axios';
import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';
import { getStream, getEpisodes } from './streams.js';

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.3',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15'
];

function getRandomHeaders() {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return {
        'User-Agent': userAgent,
        'Referer': 'https://ramaorientalfansub.tv/paese/corea-del-sud/',
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

const axiosInstance = axios.create({
    headers: getRandomHeaders()
});

export { axiosInstance, axios, cloudscraper, cheerio };

const metaCache = new Map();

async function fetchWithCloudscraper(url) {
    try {
        const data = await cloudscraper.get({
            uri: url,
            headers: getRandomHeaders()
        });
        return data;
    } catch (error) {
        console.error("Errore con Cloudscraper:", error);
        return null;
    }
}

async function getMeta(id) {
    const meta = { id, type: 'series', name: '', poster: '', episodes: [] };
    const cleanId = id.replace(/,/g, '-').toLowerCase();
    const baseId = cleanId.replace(/-\d{4}$/, '');
    const seriesLink = `https://ramaorientalfansub.tv/drama/${baseId}/`;

    if (metaCache.has(id)) {
        return { meta: metaCache.get(id) };
    }

    try {
        const data = await fetchWithCloudscraper(seriesLink);
        if (!data) {
            console.warn(`Nessun dato ricevuto per ${seriesLink}`);
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
        meta.episodes = await getEpisodes(seriesLink, $);

        metaCache.set(id, meta);
    } catch (error) {
        console.error('Errore nel caricamento dei dettagli della serie:', error);
    }

    return { meta };
}

export { getMeta };
