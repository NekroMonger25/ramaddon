// streams.js
import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.140 Mobile Safari/537.36'
];

async function fetchWithCloudscraper(url, retries = 3) {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; rv:125.0) Gecko/20100101 Firefox/125.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Mozilla/5.0 (Linux; Android 14; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.140 Mobile Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/123.0.6312.122'
    ];

    function getRandomHeaders() {
        return {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'Referer': 'https://ramaorientalfansub.tv',
            'Accept-Language': 'en-US,en;q=0.9',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
        };
    }

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[${i + 1}/${retries}] Tentativo di scraping: ${url}`);
            const response = await cloudscraper.get({
                uri: url,
                headers: getRandomHeaders(),
                followAllRedirects: true,
                maxRedirects: 2,
                timeout: 10000,
                resolveWithFullResponse: true
            });

            if (response.statusCode === 404) {
                console.warn(`[${i + 1}/${retries}] Errore 404 per ${url}. Interrompo i tentativi.`);
                return null;
            }

            if (response && response.statusCode >= 200 && response.statusCode < 300) {
                console.log(`[${i + 1}/${retries}] Scraping riuscito: ${url}`);
                return response.body;
            } else {
                console.warn(`[${i + 1}/${retries}] Errore ${response.statusCode} per ${url}. Riprovo...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`[${i + 1}/${retries}] Errore Cloudscraper per ${url}: ${error.message}`);
            if (error.message.includes('Cloudflare')) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    console.error(`[Errore finale] Impossibile recuperare ${url} dopo ${retries} tentativi.`);
    return null;
}

async function getStream(episodeLink) {
    try {
        console.log(`[getStream] Recupero stream per ${episodeLink}`);
        const episodeData = await fetchWithCloudscraper(episodeLink);

        if (!episodeData) {
            console.warn(`[getStream] Nessun dato ricevuto per ${episodeLink}`);
            return null;
        }

        const $ = cheerio.load(episodeData);

        let videoUrl = $('video > source').attr('src');
        if (!videoUrl) {
            console.warn(`[getStream] Nessun URL video trovato per ${episodeLink}`);
            return null;
        }

        console.log(`[getStream] URL video trovato: ${videoUrl}`);
        return videoUrl;
    } catch (error) {
        console.error(`[getStream] Errore durante il recupero dello stream per ${episodeLink}:`, error);
        return null;
    }
}

export { getStream };
