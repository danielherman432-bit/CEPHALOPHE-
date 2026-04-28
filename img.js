import axios from 'axios';
import config from '../config.js';

const GOOGLE_API_KEY = "AIzaSyDo09jHOJqL6boMeac-xmPHB-yD9dKOKGU";
const GOOGLE_CX = 'd1a5b18a0be544a0e';

async function searchImages(query, limit) {
    try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                q: query,
                cx: GOOGLE_CX,
                searchType: 'image',
                key: GOOGLE_API_KEY,
                num: limit
            },
            timeout: 15000
        });

        if (response.data.items && response.data.items.length > 0) {
            return response.data.items.map(item => item.link);
        }
        return [];
    } catch (error) {
        console.error('Error fetching from Google API:', error);
        return [];
    }
}

export default {
    name: 'img',
    description: 'Recherche des images sur Google',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const prefix = config.config.prefix;
        
        if (args.length === 0) {
            return await sock.sendMessage(sender, {
                text: `❌ Utilisation: ${prefix}img [terme] -[nombre]\n\nExemples:\n${prefix}img ordinateur -5\n${prefix}img kyotaka ayanokoji -20\n\n📌 Par défaut: 5 images`
            });
        }
        
        let query = '';
        let limit = 5;
        
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-') && !isNaN(parseInt(args[i].slice(1)))) {
                limit = parseInt(args[i].slice(1));
                if (limit > 20) limit = 20;
                if (limit < 1) limit = 1;
            } else {
                query += (query ? ' ' : '') + args[i];
            }
        }
        
        if (!query) {
            return await sock.sendMessage(sender, {
                text: `❌ Veuillez indiquer un terme de recherche`
            });
        }
        
        await sock.sendMessage(sender, {
            text: `🔍 Recherche de ${limit} image(s) pour "${query}"...`
        });
        
        const imageUrls = await searchImages(query, limit);
        
        if (imageUrls.length === 0) {
            return await sock.sendMessage(sender, {
                text: `❌ Aucune image trouvée pour "${query}"`
            });
        }
        
        let sentCount = 0;
        
        for (const url of imageUrls) {
            try {
                await sock.sendMessage(sender, {
                    image: { url: url },
                    caption: `📷 *${query}*\n🔗 ${url.substring(0, 50)}...\n\n> ${config.config.botName}`
                });
                sentCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.log(`Erreur envoi image: ${err.message}`);
            }
        }
        
        if (sentCount === 0) {
            await sock.sendMessage(sender, {
                text: `❌ Impossible d'envoyer les images pour "${query}"`
            });
        }
    }
};
