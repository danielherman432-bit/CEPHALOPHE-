import config from '../config.js';

export default {
    name: 'mode',
    description: 'Change le mode du bot (public/privé)',
    adminOnly: true,
    category: 'owner',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        const mode = args[0]?.toLowerCase();

        if (!mode || (mode !== 'public' && mode !== 'privé' && mode !== 'private')) {
            const currentMode = config.config.mode === 'public' ? '🌍 Public' : '🔒 Privé';
            return await sock.sendMessage(sender, {
                text: `╭━━━ *MODE ACTUEL* ━━━
┃
┃ 📌 *Mode:* ${currentMode}
┃
┃ 📖 *Utilisation:*
┃ ${prefix}mode public  → Tout le monde
┃ ${prefix}mode privé   → Seul le propriétaire
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
            });
        }

        const newMode = mode === 'public' ? 'public' : 'private';
        config.setMode(newMode);
        
        const modeText = newMode === 'public' ? '🌍 Public' : '🔒 Privé';
        const description = newMode === 'public' 
            ? 'Tout le monde peut utiliser le bot'
            : 'Seul le propriétaire peut utiliser le bot';

        await sock.sendMessage(sender, {
            text: `╭━━━ *MODE CHANGÉ* ━━━
┃
┃ ✅ *Nouveau mode:* ${modeText}
┃ 📝 ${description}
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
        });
    }
};
