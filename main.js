import pkg from 'stremio-addon-sdk';
import seriesCatalog from './rama_series.js';
import filmsCatalog from './rama_films.js';
import { getMeta } from './episodes.js';

const { addonBuilder, serveHTTP } = pkg;

const manifest = {
    "id": "community.ramaorientalfansub",
    "version": "1.0.5",
    "name": "Rama Oriental Fansub",
    "description": "Addon per visualizzare serie e film coreani dal sito Rama Oriental Fansub",
    "catalogs": [
        {
            "type": "series",
            "id": "rama_series",
            "name": "Serie Coreane",
            "extra": [{ "name": "skip" }]
        },
        {
            "type": "movie",
            "id": "rama_films",
            "name": "Film Coreani",
            "extra": [{ "name": "skip" }]
        }
    ],
    "resources": ["catalog", "meta", "stream"],
    "types": ["series", "movie"],
    "logo": "https://ramaorientalfansub.tv/wp-content/uploads/2023/10/cropped-Logo-1.png",
    "background": "https://ramaorientalfansub.tv/wp-content/uploads/2023/10/2860055-e1696595653601.jpg"
};

const builder = new addonBuilder(manifest);
const metaCache = new Map();

builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== "series") {
        return Promise.resolve({ streams: [] });
    }

    let meta = null;

    if (metaCache.has(id)) {
        meta = metaCache.get(id);
    } else {
        try {
            const metaResult = await getMeta(id);
            meta = metaResult.meta;
            metaCache.set(id, meta);
        } catch (error) {
            console.error(`Errore nel caricamento dei metadati per ${id}:`, error);
            return Promise.resolve({ streams: [] });
        }
    }

    if (!meta || !meta.episodes || meta.episodes.length === 0) {
        console.warn(`Nessun episodio trovato per ${id}`);
        return Promise.resolve({ streams: [] });
    }

    const streams = meta.episodes.flatMap(ep =>
        ep.streams.map(stream => ({
            title: `${ep.title} - ${stream.title}`,
            url: stream.url,
            type: "video/mp4",
            behaviorHints: {
                bingeGroup: id,
                notWebReady: false
            }
        }))
    );

    return Promise.resolve({ streams });
});

builder.defineCatalogHandler(async (args) => {
    if (args.type === 'series' && args.id === 'rama_series') {
        return seriesCatalog(args);
    } else if (args.type === 'movie' && args.id === 'rama_films') {
        return filmsCatalog(args);
    }
});

builder.defineMetaHandler(async (args) => {
    let meta = null;

    if (metaCache.has(args.id)) {
        meta = { meta: metaCache.get(args.id) };
    } else {
        try {
            const metaResult = await getMeta(args.id);
            meta = metaResult.meta;
            metaCache.set(args.id, meta);
        } catch (error) {
            console.error(`Errore nel caricamento dei metadati per ${args.id}:`, error);
            return { meta: null };
        }
    }

    return { meta: { ...meta, extra: meta.extra } };
});

export default builder.getInterface();

serveHTTP(builder.getInterface(), { port: 7000 });
console.log(`Addon server is running at http://localhost:7000/manifest.json`);
