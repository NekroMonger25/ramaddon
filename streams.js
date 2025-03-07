import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';

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
        'Referer': 'https://ramaorientalfansub.tv', // Assicurati che il referer sia corretto
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

// Funzione per effettuare richieste con Cloudscraper
async function fetchWithCloudscraper(url) {
    try {
        const data = await cloudscraper.get({
            uri: url,
            headers: getRandomHeaders() // Aggiungi headers casuali
        });
        return data;
    } catch (error) {
        // console.error("Errore con Cloudscraper:", error); // Rimosso console.error
        return null;
    }
}

// Funzione per recuperare i dati della serie
async function fetchSeriesData(seriesLink) {
    if (!seriesLink) {
        throw new Error("seriesLink non definito!");
    }

    const data = await fetchWithCloudscraper(seriesLink);
    if (typeof data !== "string" || !data.trim()) {
        // console.error("Errore: Il contenuto della pagina non è valido."); // Rimosso console.error
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
            // console.warn(`Nessun dato ricevuto per ${episodeLink}`); // Rimosso console.warn
            return null;
        }

        const $ = cheerio.load(data);
        iframeSrc = $('iframe').attr('src');
        if (iframeSrc) {
            iframeSrc = encodeURI(iframeSrc);
            // console.log(`Stream trovato: ${decodeURI(iframeSrc)}`); // Rimosso console.log
            if (iframeSrc.startsWith('https://server1.streamingrof.online/02-DRAMACOREANI')) {
                return iframeSrc;
            } else {
                // console.warn(`Stream non valido per ${episodeLink}: ${iframeSrc}`); // Rimosso console.warn
                return null;
            }
        } else {
            // console.warn(`Nessun iframe trovato per ${episodeLink}`); // Rimosso console.warn
            return null;
        }
    } catch (err) {
        // console.log(`Analizzando stream per: ${episodeLink}`); // Rimosso console.log
        // console.log('Iframe trovato:', iframeSrc); // Rimosso console.log
        // console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err); // Rimosso console.error
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
        // console.log('Chiamata a getEpisodes con URL:', seriesLink); // Rimosso console.log
        let seriesId = seriesLink.split('/').filter(Boolean).pop();
        // console.log('ID della serie estratto prima della pulizia:', seriesId); // Rimosso console.log
        seriesId = seriesId.replace(/,/g, '').replace(/\s+/g, '-').toLowerCase();
        // console.log('ID della serie dopo la pulizia:', seriesId); // Rimosso console.log
        let seriesYear = null;
        // Estrai l'anno dalla pagina della serie (se presente)
        try {
            const titleText = $('title').text();
            const yearMatch = titleText.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                seriesYear = yearMatch[0];
            }
        } catch (error) {
            // console.error('Errore durante il recupero dell\'anno della serie:', error); // Rimosso console.error
        }

        // console.log('Anno serie:', seriesYear); // Rimosso console.log

        // Trova il numero massimo di episodi disponibili
        let maxEpisodes = 32; // Default value if not found
        try {
            // Prova a estrarre il numero di episodi da un elemento specifico della pagina
            const episodeCountText = $('div.font-light > div:nth-child(2)').text().trim(); // Adjust the selector as needed
            const episodeCountMatch = episodeCountText.match(/Totale: (\d+)/);
            if (episodeCountMatch && episodeCountMatch[1]) {
                maxEpisodes = parseInt(episodeCountMatch[1], 10);
                // console.log(`Numero massimo di episodi trovato nella pagina: ${maxEpisodes}`); // Rimosso console.log
            } else {
                // console.warn("Numero di episodi non trovato nella pagina, usando il valore di default (32)."); // Rimosso console.warn
            }
        } catch (error) {
            // console.error("Errore durante l'estrazione del numero di episodi:", error); // Rimosso console.error
        }

        // Scansiona gli episodi fino al numero massimo trovato o fino a quando non ne trovi più
        for (let episodeNumber = 1; episodeNumber <= maxEpisodes; episodeNumber++) {
            const episodeId = seriesYear ? `${seriesId}-${seriesYear}` : seriesId;
            const episodeLink = `https://ramaorientalfansub.tv/watch/${episodeId}-episodio-${episodeNumber}/`;
            // console.log(`URL dell'episodio generato: ${episodeLink}`); // Rimosso console.log
            try {
                const stream = await getStream(episodeLink);
                if (!stream) {
                    // console.log(`Stream non trovato per l'episodio ${episodeNumber}, interrompendo la ricerca.`); // Rimosso console.log
                    break; // Interrompi il ciclo se lo stream non viene trovato
                }

                episodes.push({
                    id: `episodio-${episodeNumber}`,
                    title: `${episodeNumber}`,
                    thumbnail: '',
                    streams: [{
                        title: `Episodio ${episodeNumber}`,
                        url: stream,
                        type: "video/mp4"
                    }]
                });
                // Aggiungi un ritardo tra le richieste per ogni episodio
                await new Promise(resolve => setTimeout(resolve, 1000)); // Aspetta 1 secondo
            } catch (err) {
                // console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err); // Rimosso console.error
            }
        }

        // console.log('Episodi trovati:', JSON.stringify(episodes, null, 2)); // Rimosso console.log
        return episodes;
    } catch (err) {
        // console.error('Errore durante il recupero degli episodi:', err); // Rimosso console.error
        return [];
    }
}

export { getEpisodes };

// (async () => { // Rimosso l'invocazione immediata della funzione asincrona
//     const seriesLink = "https://ramaorientalfansub.tv/drama/";
//     const $ = await fetchSeriesData(seriesLink);
// })();
