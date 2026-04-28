import config from '../config.js';

const startTime = Date.now();

export default {
    name: 'uptime',
    description: 'Affiche le temps d\'activitÃ© du bot',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const uptime = Date.now() - startTime;
        
        const seconds = Math.floor((uptime / 1000) % 60);
        const minutes = Math.floor((uptime / (1000 * 60)) % 60);
        const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        
        let uptimeStr = '';
        if (days > 0) uptimeStr += `${days}j `;
        if (hours > 0) uptimeStr += `${hours}h `;
        if (minutes > 0) uptimeStr += `${minutes}m `;
        uptimeStr += `${seconds}s`;
        
        const statusEmoji = uptime < 3600000 ? 'ðŸŸ¢' : uptime < 86400000 ? 'ðŸŸ¡' : 'ðŸ”´';
        
        const text = `â•­â”â”â” *UPTIME* â”â”â”
â”ƒ
â”ƒ ${statusEmoji} *Actif depuis:*
â”ƒ ${uptimeStr}
â”ƒ
â”ƒ ðŸ“… *DÃ©marrage:*
â”ƒ ${new Date(startTime).toLocaleString('fr-FR')}
â”ƒ
â•°â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

> ${config.config.botName}`;

        await sock.sendMessage(sender, { text });
    }
}
