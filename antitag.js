import config from '../config.js';

const userMentionWarnings = new Map();

export default {
    name: 'antitag',
    description: 'Protège le groupe contre les mentions dans les statuts',
    adminOnly: false,
    category: 'group',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        
        if (!isGroup) {
            return await sock.sendMessage(sender, {
                text: '❌ Cette commande fonctionne uniquement dans les groupes'
            });
        }
        
        const groupMetadata = await sock.groupMetadata(sender);
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .some(p => p.id === participant);
        
        if (!isAdmin) {
            return await sock.sendMessage(sender, {
                text: '❌ Seuls les admins du groupe peuvent utiliser cette commande'
            });
        }
        
        const groupId = sender;
        const action = args[0]?.toLowerCase();
        
        if (!action || (action !== 'on' && action !== 'off')) {
            const settings = config.getSettings(groupId);
            const status = settings.antiMention ? '✅ Activé' : '❌ Désactivé';
            return await sock.sendMessage(sender, {
                text: `╭━━━ *ANTI-MENTION* ━━━
┃
┃ 📌 *Statut:* ${status}
┃ ⚠️ *Warn max:* 3
┃
┃ 📖 *Commandes:*
┃ ${prefix}antitag on  → Activer
┃ ${prefix}antitag off → Désactiver
┃
┃ 📝 *Description:*
┃ Supprime les mentions du groupe
┃ dans les statuts WhatsApp
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
        }
        
        if (action === 'on') {
            config.updateGroupSetting(groupId, 'antiMention', true);
            await sock.sendMessage(sender, {
                text: `✅ *Anti-mention activé*\n\nLes mentions du groupe dans les statuts seront supprimées. 3 warns = expulsion.`
            });
        } 
        else if (action === 'off') {
            config.updateGroupSetting(groupId, 'antiMention', false);
            if (userMentionWarnings.has(groupId)) {
                userMentionWarnings.delete(groupId);
            }
            await sock.sendMessage(sender, {
                text: `❌ *Anti-mention désactivé*`
            });
        }
    },
    
    handleStatus: async (sock, statusMsg, groupJid) => {
        const settings = config.getSettings(groupJid);
        if (!settings.antiMention) return;
        
        const text = statusMsg.message?.textMessage?.text || 
                    statusMsg.message?.conversation || '';
        
        const groupLink = `https://chat.whatsapp.com/`;
        const groupId = groupJid.replace('@g.us', '');
        
        if (!text.includes(groupLink) && !text.includes(groupId)) return;
        
        const sender = statusMsg.key?.participant || statusMsg.key?.remoteJid;
        
        const groupMetadata = await sock.groupMetadata(groupJid);
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .some(p => p.id === sender);
        
        if (isAdmin) return;
        
        if (!userMentionWarnings.has(groupJid)) {
            userMentionWarnings.set(groupJid, new Map());
        }
        
        const groupWarnings = userMentionWarnings.get(groupJid);
        const currentWarns = groupWarnings.get(sender) || 0;
        const newWarns = currentWarns + 1;
        
        try {
            await sock.sendMessage(groupJid, {
                delete: statusMsg.key
            });
        } catch (err) {}
        
        if (newWarns >= 3) {
            await sock.sendMessage(groupJid, {
                text: `🚨 *EXPULSION*\n\n@${sender.split('@')[0]} a été expulsé pour avoir mentionné le groupe 3 fois dans ses statuts.`,
                mentions: [sender]
            });
            
            await sock.groupParticipantsUpdate(groupJid, [sender], 'remove');
            groupWarnings.delete(sender);
        } else {
            groupWarnings.set(sender, newWarns);
            await sock.sendMessage(groupJid, {
                text: `⚠️ *MENTION INTERDITE*\n\n@${sender.split('@')[0]}, tu ne peux pas mentionner le groupe dans tes statuts.\n\n⚠️ Avertissement ${newWarns}/3`,
                mentions: [sender]
            });
        }
    }
};
