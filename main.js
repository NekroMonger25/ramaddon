import pkg from 'stremio-addon-sdk';
import seriesCatalog from './rama_series.js';
import filmsCatalog from './rama_films.js';
import { getMeta } from './episodes.js';
import { getEpisodes } from './streams.js';

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
            "extra": [{"name": "skip"}]
        },
        {
            "type": "movie",
            "id": "rama_films",
            "name": "Film Coreani",
            "extra": [{"name": "skip"}]
        }
    ],
    "resources": ["catalog", "meta", "stream"], // Aggiunto stream
    "types": ["series", "movie"],
    "logo": "https://ramaorientalfansub.tv/wp-content/uploads/2023/10/cropped-Logo-1.png",
    "background": "https://ramaorientalfansub.tv/wp-content/uploads/2023/10/2860055-e1696595653601.jpg"
};

const builder = new addonBuilder(manifest);

// **GESTORE STREAM**
builder.defineStreamHandler(async ({ type, id }) => {
    if (type !== "series") {
        return Promise.resolve({ streams: [] });
    }

    console.log(`Richiesta stream per ID: ${id}`);

    const episodes = await getEpisodes(`https://ramaorientalfansub.tv/drama/${id}/`);

    if (!episodes || episodes.length === 0) {
        console.warn(`Nessun episodio trovato per ${id}`);
        return Promise.resolve({ streams: [] });
    }

    const streams = episodes.flatMap(ep => 
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


// **GESTORE CATALOGHI**
builder.defineCatalogHandler(async (args) => {
    if (args.type === 'series' && args.id === 'rama_series') {
        return seriesCatalog(args);
    } else if (args.type === 'movie' && args.id === 'rama_films') {
        return filmsCatalog(args);
    }
});

// **GESTORE METADATI**
builder.defineMetaHandler(async (args) => getMeta(args.id));

export default builder.getInterface();

// **AVVIA IL SERVER**
serveHTTP(builder.getInterface(), { port: 7000 });
console.log(`Addon server is running at http://localhost:7000/manifest.json`);
