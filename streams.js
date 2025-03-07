import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.3',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Safari/605.1.15'
];

function getRandomHeaders() {
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    return {
        'User-Agent': userAgent,
        'Referer': 'https://ramaorientalfansub.tv',
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

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
        console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err);
        return null;
    }
}

async function getEpisodes(seriesLink, $) {
    try {
        const episodes = [];
        const baseEpisodeUrl = seriesLink.replace('/drama/', '/watch/');
        let seriesId = seriesLink.split('/').filter(Boolean).pop();
        seriesId = seriesId.replace(/,/g, '-').toLowerCase();
        let seriesYear = null;

        try {
            const titleText = $('title').text();
            const yearMatch = titleText.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                seriesYear = yearMatch[0];
            }
        } catch (error) {
            console.error('Errore durante il recupero dell\'anno della serie:', error);
        }

        let episodeNumber = 1;
        while (true) {
            const episodeId = seriesYear ? `${seriesId}-${seriesYear}` : seriesId;
            const episodeLink = `https://ramaorientalfansub.tv/watch/${episodeId}-episodio-${episodeNumber}/`;
            try {
                const stream = await getStream(episodeLink);
                if (!stream) {
                    break;
                }

                episodes.push({
                    id: `episodio-${episodeNumber}`,
                    title: `${episodeNumber}`,
                    thumbnail: 'div.swiper-slide:nth-child(1)',
                    streams: [{
                        title: `Episodio ${episodeNumber}`,
                        url: stream,
                        type: "video/mp4"
                    }]
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Errore durante il recupero dello stream per ${episodeLink}:`, err);
                break;
            }

            episodeNumber++;
        }

        return episodes;
    } catch (err) {
        console.error('Errore durante il recupero degli episodi:', err);
        return [];
    }
}

export { getEpisodes, getStream };
