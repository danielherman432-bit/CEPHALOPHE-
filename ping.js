import config from '../config.js';

export default {
    name: 'ping',
    description: 'Vérifie la latence du bot',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const start = Date.now();
        
        const sentMsg = await sock.sendMessage(sender, { 
            text: '📡 *Test de connexion...*' 
        });

        const end = Date.now();
        const latency = end - start;
        
        let emoji = '🟢';
        if (latency > 500) emoji = '🟡';
        if (latency > 1000) emoji = '🔴';
        
        const pingText = `╔══════════════════╗
║   *PONG !*  🏓
╚══════════════════╝

${emoji} *Latence:* ${latency}ms
⚡ *Statut:* ${latency < 300 ? 'Excellent' : latency < 600 ? 'Bon' : 'Lent'}
📶 *Réseau:* ${sock.user?.id ? 'Connecté' : 'Instable'}

> ${config.config.botName} • Ping Test`;

        await sock.sendMessage(sender, { 
            text: pingText,
            edit: sentMsg.key
        });
    }
}
