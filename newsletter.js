import config from '../config.js';

export default {
    name: 'newsletter',
    description: 'Obtenir l\'ID d\'une chaîne WhatsApp',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        try {
            if (!sender.includes('@newsletter')) {
                return await sock.sendMessage(sender, { 
                    text: '❌ Cette commande fonctionne uniquement dans une chaîne WhatsApp' 
                });
            }

            const channelId = sender;
            
            await sock.sendMessage(sender, {
                text: `╔══════════════════╗
║   *CHAÎNE WHATSAPP*   
╚══════════════════╝

🆔 *ID:* ${channelId}

🔗 *Lien direct:* https://whatsapp.com/channel/${channelId.split('@')[0]}

📝 *Utilisation:* 
Tu peux partager cet ID pour que d'autres puissent rejoindre ta chaîne via la commande !join ${channelId}

> ${config.config.botName} • Newsletter System`
            });

        } catch (error) {
            await sock.sendMessage(sender, { text: '❌ Erreur lors de la récupération de l\'ID' });
        }
    }
}
