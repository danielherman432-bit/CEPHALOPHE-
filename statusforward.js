import config from '../config.js';

export default {
    name: 'statusforward',
    description: 'Active/désactive l\'envoi des statuts au propriétaire',
    adminOnly: true,
    category: 'owner',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        const action = args[0]?.toLowerCase();
        
        if (!action || (action !== 'on' && action !== 'off')) {
            const currentStatus = config.isStatusForwardEnabled() ? '✅ Activé' : '❌ Désactivé';
            return await sock.sendMessage(sender, {
                text: `╭━━━ *STATUS FORWARD* ━━━
┃
┃ 📌 *État actuel:* ${currentStatus}
┃
┃ 📖 *Commandes:*
┃ ${prefix}statusforward on  → Activer
┃ ${prefix}statusforward off → Désactiver
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
        }
        
        if (action === 'on') {
            config.setStatusForward(true);
            await sock.sendMessage(sender, {
                text: `✅ *Status Forward activé*\n\nLes statuts seront envoyés automatiquement.`
            });
        } else if (action === 'off') {
            config.setStatusForward(false);
            await sock.sendMessage(sender, {
                text: `❌ *Status Forward désactivé*\n\nLes statuts ne seront plus envoyés.`
            });
        }
    }
};
