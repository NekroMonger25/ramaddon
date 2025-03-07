import axios from 'axios';
import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const axiosInstance = axios.create({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Referer': 'https://ramaorientalfansub.tv/',
        'Accept-Language': 'en-US,en;q=0.9',
    }
});
export { axiosInstance, axios, puppeteer, cheerio };


async function fetchSeriesData(seriesLink) {
    if (!seriesLink) {
        throw new Error("seriesLink non definito!");
    }

    // const data = await fetchWithCloudscraper(seriesLink);
    
    // Controllo se data è una stringa valida
    if (typeof data !== "string" || !data.trim()) {
        console.error("Errore: Il contenuto della pagina non è valido.");
        return null;
    }

    return cheerio.load(data);
}

/**
 * Recupera il link dello stream per un episodio specifico.
 * @param {string} episodeLink - URL della pagina dell'episodio.
 * @returns {string|null} - URL dello stream o null se non trovato.
 */
async function getStream(episodeLink) {
    try {
        const { data } = await axios.get(episodeLink);
        const $ = cheerio.load(data);

        const iframeSrc = encodeURI($('iframe').attr('src'));
        console.log(`Stream trovato: ${decodeURI(iframeSrc)}`);

        if (iframeSrc && iframeSrc.startsWith('https://server1.streamingrof.online/02-DRAMACOREANI')) {
            return iframeSrc;
        } else {
            console.warn(`Stream non valido per ${episodeLink}: ${iframeSrc}`);
            return null;
        }
    } catch (err) {
        console.log(`Analizzando stream per: ${episodeLink}`);
        console.log('Iframe trovato:', iframeSrc);
        console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err);
        return null;
    }
}

/**
 * Recupera la lista degli episodi e i rispettivi stream per una serie.
 * @param {string} seriesLink - URL della pagina della serie.
 * @returns {Array} - Lista di episodi con titolo, thumbnail e link allo stream.
 */
async function getEpisodes(seriesLink) {
    try {
        const episodes = [];
        const baseEpisodeUrl = seriesLink.replace('/drama/', '/watch/');

        console.log('Chiamata a getEpisodes con URL:', seriesLink);

        let seriesId = seriesLink.split('/').filter(Boolean).pop();
        console.log('ID della serie estratto prima della pulizia:', seriesId);

        seriesId = seriesId.replace(/,/g, '').replace(/\s+/g, '-').toLowerCase();
        console.log('ID della serie dopo la pulizia:', seriesId);

        let seriesYear = null;

        try {
            const { data } = await axiosInstance.get(seriesLink);
            const $ = cheerio.load(data);

            const titleText = $('title').text();
            const yearMatch = titleText.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                seriesYear = yearMatch[0];
            }
        } catch (error) {
            console.error('Errore durante il recupero dell\'anno della serie:', error);
        }

        console.log('Anno serie:', seriesYear);

        for (let episodeNumber = 1; episodeNumber <= 30; episodeNumber++) {
            const episodeId = seriesYear ? `${seriesId}-${seriesYear}` : seriesId;
            const episodeLink = `https://ramaorientalfansub.tv/watch/${episodeId}-episodio-${episodeNumber}/`;
            console.log(`URL dell'episodio generato: ${episodeLink}`);

            try {
                const stream = await getStream(episodeLink);
                if (!stream) continue;

                episodes.push({
                    id: `episodio-${episodeNumber}`,
                    title: `Episodio ${episodeNumber}`,
                    thumbnail: 'https://ramaorientalfansub.tv/wp-content/uploads/2023/10/cropped-Logo-1.png',
                    streams: [
                        {
                            title: `Episodio ${episodeNumber}`,
                            url: stream,
                            type: "video/mp4"
                        }
                    ]
                });
            } catch (err) {
                console.log('Episodi trovati:', JSON.stringify(episodes, null, 2));
                console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err);
            }
        }

        return episodes;
    } catch (err) {
        console.error('Errore durante il recupero degli episodi:', err);
        return [];
    }
}

export { getEpisodes };

(async () => {
    const seriesLink = "https://ramaorientalfansub.tv/drama/";
    const $ = await fetchSeriesData(seriesLink);
})();
