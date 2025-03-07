import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';

// Lista di User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.3',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15'
];

// Funzione per ottenere headers casuali
function getRandomHeaders() {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return {
        'User-Agent': userAgent,
        'Referer': 'https://ramaorientalfansub.tv', // Assicurati che il referer sia corretto
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

async function fetchWithCloudscraper(url) {
    try {
        const data = await cloudscraper.get({
            uri: url,
            headers: getRandomHeaders() // Aggiungi headers casuali
        });
        return data;
    } catch (error) {
        console.error("Errore con Cloudscraper:", error);
        return null;
    }
}

async function fetchSeriesData(seriesLink) {
    if (!seriesLink) {
        throw new Error("seriesLink non definito!");
    }

    const data = await fetchWithCloudscraper(seriesLink);
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
    let iframeSrc = null;
    try {
        const data = await fetchWithCloudscraper(episodeLink);
        if (!data) {
            console.warn(`Nessun dato ricevuto per ${episodeLink}`);
            return null;
        }

        const $ = cheerio.load(data);
        iframeSrc = $('iframe').attr('src');

        if (iframeSrc) {
            iframeSrc = encodeURI(iframeSrc);
            console.log(`Stream trovato: ${decodeURI(iframeSrc)}`);
            if (iframeSrc.startsWith('https://server1.streamingrof.online/02-DRAMACOREANI')) {
                return iframeSrc;
            } else {
                console.warn(`Stream non valido per ${episodeLink}: ${iframeSrc}`);
                return null;
            }
        } else {
            console.warn(`Nessun iframe trovato per ${episodeLink}`);
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
 * @param {CheerioStatic} $ - Oggetto Cheerio caricato con la pagina della serie.
 * @returns {Array} - Lista di episodi con titolo, thumbnail e link allo stream.
 */
async function getEpisodes(seriesLink, $) {
    try {
        const episodes = [];
        const baseEpisodeUrl = seriesLink.replace('/drama/', '/watch/');
        console.log('Chiamata a getEpisodes con URL:', seriesLink);
        let seriesId = seriesLink.split('/').filter(Boolean).pop();
        console.log('ID della serie estratto prima della pulizia:', seriesId);
        seriesId = seriesId.replace(/,/g, '').replace(/\s+/g, '-').toLowerCase();
        console.log('ID della serie dopo la pulizia:', seriesId);
        let seriesYear = null;

        // Estrai l'anno dalla pagina della serie (se presente)
        try {
            const titleText = $('title').text();
            const yearMatch = titleText.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                seriesYear = yearMatch[0];
            }
        } catch (error) {
            console.error('Errore durante il recupero dell\'anno della serie:', error);
        }
        console.log('Anno serie:', seriesYear);

        // Trova il numero massimo di episodi disponibili
        let maxEpisodes = 32; // Default value if not found
        try {
            // Prova a estrarre il numero di episodi da un elemento specifico della pagina
            const episodeCountText = $('div.font-light > div:nth-child(2)').text().trim(); // Adjust the selector as needed
            const episodeCountMatch = episodeCountText.match(/Totale: (\d+)/);
            if (episodeCountMatch && episodeCountMatch[1]) {
                maxEpisodes = parseInt(episodeCountMatch[1], 10);
                console.log(`Numero massimo di episodi trovato nella pagina: ${maxEpisodes}`);
            } else {
                console.warn("Numero di episodi non trovato nella pagina, usando il valore di default (32).");
            }
        } catch (error) {
            console.error("Errore durante l'estrazione del numero di episodi:", error);
        }

        // Scansiona gli episodi fino al numero massimo trovato o fino a quando non ne trovi più
        for (let episodeNumber = 1; episodeNumber <= maxEpisodes; episodeNumber++) {
            const episodeId = seriesYear ? `${seriesId}-${seriesYear}` : seriesId;
            const episodeLink = `https://ramaorientalfansub.tv/watch/${episodeId}-episodio-${episodeNumber}/`;
            console.log(`URL dell'episodio generato: ${episodeLink}`);

            try {
                const stream = await getStream(episodeLink);
                if (!stream) {
                    console.log(`Stream non trovato per l'episodio ${episodeNumber}, interrompendo la ricerca.`);
                    break; // Interrompi il ciclo se lo stream non viene trovato
                }

                episodes.push({
                    id: `episodio-${episodeNumber}`,
                    title: `Episodio ${episodeNumber}`,
                    thumbnail: 'https://ramaorientalfansub.tv/wp-content/uploads/2023/10/cropped-Logo-1.png',
                    streams: [{
                        title: `Episodio ${episodeNumber}`,
                        url: stream,
                        type: "video/mp4"
                    }]
                });
                // Aggiungi un ritardo tra le richieste per ogni episodio
                await new Promise(resolve => setTimeout(resolve, 1000)); // Aspetta 1 secondo
            } catch (err) {
                console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err);
            }
        }

        console.log('Episodi trovati:', JSON.stringify(episodes, null, 2));
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
