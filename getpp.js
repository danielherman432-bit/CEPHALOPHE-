import config from '../config.js';

export default {
    name: 'getpp',
    description: 'Récupère la photo de profil d\'un utilisateur',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const prefix = config.config.prefix;
        let targetJid = sender;
        
        if (args[0]) {
            let mention = args[0].replace(/[^0-9]/g, '');
            if (mention.length >= 10 && mention.length <= 15) {
                targetJid = `${mention}@s.whatsapp.net`;
            } else if (args[0].includes('@')) {
                targetJid = args[0];
            }
        }
        
        if (isGroup && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        
        try {
            const ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            const targetNumber = targetJid.split('@')[0];
            let displayNumber = targetNumber;
            
            if (targetNumber.length > 14) {
                displayNumber = 'Utilisateur WhatsApp';
            }
            
            await sock.sendMessage(sender, {
                image: { url: ppUrl },
                caption: `╭━━━ *PHOTO DE PROFIL* ━━━
┃
┃ 👤 *Utilisateur:* ${displayNumber}
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
            });
        } catch (error) {
            await sock.sendMessage(sender, {
                text: `❌ Aucune photo de profil trouvée`
            });
        }
    }
};
