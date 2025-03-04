const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://ramaorientalfansub.tv/paese/corea-del-sud/';
const ITEMS_PER_PAGE = 25;
const MAX_PAGES = 32; // Numero massimo di pagine da esplorare

async function getCatalog(skip = 0) {
    const catalog = [];
    let pageNumber = Math.floor(skip / ITEMS_PER_PAGE) + 1;
    let pagesChecked = 0;

    // Continua a scorrere le pagine fino a trovare risultati o raggiungere il limite di MAX_PAGES
    while (catalog.length < ITEMS_PER_PAGE && pagesChecked < MAX_PAGES) {
        const pageUrl = `${BASE_URL}page/${pageNumber}/`;
        console.log(`Richiedendo pagina: ${pageNumber}`);

        try {
            const { data } = await axios.get(pageUrl);
            const $ = cheerio.load(data);
            let foundItemsOnPage = false;

            $('div.w-full.bg-gradient-to-t.from-primary').each((index, element) => {
                if (catalog.length >= ITEMS_PER_PAGE) return false; // Interrompi il ciclo se raggiungi ITEMS_PER_PAGE elementi

                const titleElement = $(element).find('a.text-sm.line-clamp-2.font-medium.leading-snug.lg\\:leading-normal');
                const title = titleElement.text().trim();
                const link = titleElement.attr('href');
                const poster = $(element).find('img').attr('src');

                const tagElement = $(element).find('.inline-block.md\\:my-3.uppercase');
                const tagText = tagElement.text().trim().toLowerCase();

                if (tagText.includes('tv')) {
                    if (title && link) {
                        const formattedTitle = title.replace(/\s+/g, '-').toLowerCase().replace(/[()]/g, '');
                        catalog.push({
                            id: formattedTitle,
                            type: 'series',
                            name: title,
                            poster,
                            description: title,
                            imdbRating: "N/A",
                            released: 2024
                        });
                        foundItemsOnPage = true;
                    }
                }
            });

            // Log degli elementi trovati
            console.log(`Pagina ${pageNumber}: trovati ${foundItemsOnPage ? 'alcuni' : 'nessun'} elementi.`);

            // Se non sono stati trovati elementi, conta la pagina come "vuota"
            if (!foundItemsOnPage) {
                console.warn(`Pagina ${pageNumber} vuota.`);
            }

        } catch (error) {
            console.error(`Errore nel caricamento della pagina ${pageNumber}:`, error);
        }

        pageNumber++; // Passa alla pagina successiva
        pagesChecked++;
    }

    // Log finale dei risultati
    console.log(`Totale elementi raccolti: ${catalog.length}`);
    return catalog;
}

module.exports = async (args) => {
    const skip = args.extra?.skip || 0;
    return { metas: await getCatalog(skip) };
};
