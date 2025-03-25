import cloudscraper from 'cloudscraper';
import * as cheerio from 'cheerio';


const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
];

function getRandomHeaders() {
    return {
        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'Referer': 'https://ramaorientalfansub.tv/paese/corea-del-sud/',
        'Accept-Language': 'en-US,en;q=0.9'
    };
}

async function fetchWithCloudscraper(url) {
    try {
        const data = await cloudscraper.get({
            uri: url,
            headers: getRandomHeaders(),
            followAllRedirects: true,
            maxRedirects: 2,
            timeout: 10000,
        });
        return data;
    } catch (error) {
        console.error("Errore con Cloudscraper:", error);
        return null;
    }
}

const BASE_URL = 'https://ramaorientalfansub.tv/paese/corea-del-sud/';
const ITEMS_PER_PAGE = 25;
const MAX_PAGES = 35;
const catalogCache = new Map();

// Funzione per pulire il titolo dai duplicati
function cleanTitle(title) {
    const words = title.split(/\s+/); // Dividi la stringa in parole
    const uniqueWords = [];
    for (const word of words) {
        if (uniqueWords.indexOf(word) === -1) {
            uniqueWords.push(word);
        }
    }
    return uniqueWords.join(' '); // Ricongiungi le parole uniche
}

async function getCatalog(skip = 0, searchQuery = '') {
    const catalog = [];
    let pageNumber = Math.floor(skip / ITEMS_PER_PAGE) + 1;
    let itemsToLoad = ITEMS_PER_PAGE;
    let foundItemsOnPage = 0;

    while (catalog.length < itemsToLoad && pageNumber <= MAX_PAGES) {
        const pageUrl = `${BASE_URL}page/${pageNumber}/`;
        let data;

        if (catalogCache.has(pageUrl)) {
            data = catalogCache.get(pageUrl);
        } else {
            try {
                data = await fetchWithCloudscraper(pageUrl);
                if (!data) {
                    pageNumber++;
                    continue;
                }
                catalogCache.set(pageUrl, data);
            } catch (error) {
                console.error(`Errore nel caricamento della pagina ${pageNumber}:`, error);
                pageNumber++;
                continue;
            }
        }

        const $ = cheerio.load(data);
        
        $('div.bg-gradient-to-t').each((index, element) => {
            if (catalog.length >= itemsToLoad) return false;

            
            const posterElement = $(element).find('.w-full.bg-gradient-to-t > .block.relative > img');
            let poster = posterElement.attr('src');
            if (!poster) {
                console.warn(`Poster mancante per l'elemento ${index}`);
                return true;
            }

            const titleElement = $(element).find('a.text-sm.line-clamp-2.font-medium.leading-snug.lg\\:leading-normal');
            let title = titleElement.text().trim();
            
             // Pulisci il titolo
             title = cleanTitle(title);

            // Filtra i risultati in base alla query di ricerca
            if (searchQuery && !title.toLowerCase().includes(searchQuery)) {
                return true; // Salta questo elemento se non corrisponde alla ricerca
            }

            
            const link = titleElement.attr('href');

            const tagElement = $(element).find('div.text-xs.text-text-color.w-full.line-clamp-1.absolute.bottom-1.text-opacity-75 span.inline-block.md\\:mlb-3.uppercase');
            const tagText = tagElement.text().trim().toLowerCase();

            const excludeElement = $(element).find('div.bg-gradient-to-t > div > div:nth-child(3) > span:nth-child(2)');
            const excludeText = excludeElement.text().trim();

            if (excludeText.includes('E ?')) {
                return true;
            }

            if (tagText.includes('tv')) {
                if (title && link) {
                    if (searchQuery && !title.toLowerCase().includes(searchQuery)) {
                        return true; // Salta questo elemento se non corrisponde alla ricerca
                    }

                    const formattedTitle = title.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '');
                    const meta = {
                        id: formattedTitle,
                        type: 'series',
                        name: title,
                        poster: poster || 'https://example.com/default-poster.jpg',
                        released: 2024,
                    };
                
                catalog.push(meta);
                foundItemsOnPage++;
            }
        }
        });

        pageNumber++;
    }

    return catalog;
}

export default async function (args) {
    const skip = args.extra?.skip || 0;
    const searchQuery = args.extra?.search || '';
    const metas = await getCatalog(skip, searchQuery);
    return { metas };
};