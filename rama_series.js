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
        'Referer': 'https://ramaorientalfansub.tv/paese/corea-del-sud/',
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

// Funzione per effettuare richieste con Cloudscraper
async function fetchWithCloudscraper(url) {
    try {
        const data = await cloudscraper.get({
            uri: url,
            headers: getRandomHeaders()
        });
        return data;
    } catch (error) {
        // console.error("Errore con Cloudscraper:", error);
        return null;
    }
}

const BASE_URL = 'https://ramaorientalfansub.tv/paese/corea-del-sud/';
const ITEMS_PER_PAGE = 25;
const MAX_PAGES = 32;

async function getCatalog(skip = 0) {
    const catalog = [];
    let pageNumber = Math.floor(skip / ITEMS_PER_PAGE) + 1;
    let pagesChecked = 0;

    while (catalog.length < ITEMS_PER_PAGE && pagesChecked < MAX_PAGES) {
        const pageUrl = `${BASE_URL}page/${pageNumber}/`;
        // console.log(`Richiedendo pagina: ${pageNumber}`);
        try {
            const data = await fetchWithCloudscraper(pageUrl);
            if (!data) {
                // console.warn(`Nessun dato ricevuto per ${pageUrl}`);
                pagesChecked++;
                pageNumber++;
                continue;
            }

            const $ = cheerio.load(data);
            let foundItemsOnPage = false;

            $('div.w-full.bg-gradient-to-t.from-primary').each((index, element) => {
                if (catalog.length >= ITEMS_PER_PAGE) return false;

                const titleElement = $(element).find('a.text-sm.line-clamp-2.font-medium.leading-snug.lg\\:leading-normal');
                const title = titleElement.text().trim();
                const link = titleElement.attr('href');
                const poster = $(element).find('img').attr('src');
                const tagElement = $(element).find('.inline-block.md\\:my-3.uppercase');
                const tagText = tagElement.text().trim().toLowerCase();
                let extraTag = null;

                if (tagText.includes('completed')) {
                    extraTag = 'completed';
                } else if (tagText.includes('simulcast')) {
                    extraTag = 'simulcast';
                }

                if (tagText.includes('tv')) {
                    if (title && link) {
                        const formattedTitle = title.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '');
                        const meta = {
                            id: formattedTitle,
                            type: 'series',
                            name: title,
                            poster,
                            description: title,
                            imdbRating: "N/A",
                            released: 2024,
                        };

                        if (extraTag) {
                            meta.extra = { tag: extraTag };
                        }

                        catalog.push(meta);
                        foundItemsOnPage = true;
                    }
                }
            });

            // console.log(`Pagina ${pageNumber}: trovati ${foundItemsOnPage ? 'alcuni' : 'nessun'} elementi.`);
            if (!foundItemsOnPage) {
                // console.warn(`Pagina ${pageNumber} vuota.`);
            }
        } catch (error) {
            // console.error(`Errore nel caricamento della pagina ${pageNumber}:`, error);
        }

        // Aggiungi un ritardo tra le richieste
        await new Promise(resolve => setTimeout(resolve, 1000));
        pageNumber++;
        pagesChecked++;
    }

    // console.log(`Totale elementi raccolti: ${catalog.length}`);
    return catalog;
}

export default async function (args) {
    const skip = args.extra?.skip || 0;
    return { metas: await getCatalog(skip) };
};
