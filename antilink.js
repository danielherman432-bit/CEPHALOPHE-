import config from '../config.js';

const userWarnings = new Map();

export default {
    name: 'antilink',
    description: 'Gère l\'anti-liens dans le groupe',
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
        
        if (!action || (action !== 'on' && action !== 'off' && action !== 'allow' && action !== 'unallow')) {
            const settings = config.getSettings(groupId);
            const status = settings.antiLink ? '✅ Activé' : '❌ Désactivé';
            return await sock.sendMessage(sender, {
                text: `╭━━━ *ANTILINK* ━━━
┃
┃ 📌 *Statut:* ${status}
┃ ⚠️ *Warn max:* 3
┃
┃ 📖 *Commandes:*
┃ ${prefix}antilink on   → Activer
┃ ${prefix}antilink off  → Désactiver
┃ ${prefix}antilink allow @user → Autoriser
┃ ${prefix}antilink unallow @user → Retirer autorisation
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
            });
        }
        
        if (action === 'on') {
            config.updateGroupSetting(groupId, 'antiLink', true);
            await sock.sendMessage(sender, {
                text: `✅ *Anti-liens activé*\n\nLes liens seront supprimés. 3 warns = expulsion.`
            });
        } 
        else if (action === 'off') {
            config.updateGroupSetting(groupId, 'antiLink', false);
            if (userWarnings.has(groupId)) {
                userWarnings.delete(groupId);
            }
            await sock.sendMessage(sender, {
                text: `❌ *Anti-liens désactivé*`
            });
        }
        else if (action === 'allow') {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned || mentioned.length === 0) {
                return await sock.sendMessage(sender, {
                    text: `❌ Mentionne l'utilisateur à autoriser\n\nExemple: ${prefix}antilink allow @user`
                });
            }
            
            const target = mentioned[0];
            const allowedUsers = config.getSettings(groupId).allowedLinks || [];
            
            if (!allowedUsers.includes(target)) {
                allowedUsers.push(target);
                config.updateGroupSetting(groupId, 'allowedLinks', allowedUsers);
                await sock.sendMessage(sender, {
                    text: `✅ @${target.split('@')[0]} peut maintenant envoyer des liens`,
                    mentions: [target]
                });
            } else {
                await sock.sendMessage(sender, {
                    text: `⚠️ @${target.split('@')[0]} est déjà autorisé`,
                    mentions: [target]
                });
            }
        }
        else if (action === 'unallow') {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned || mentioned.length === 0) {
                return await sock.sendMessage(sender, {
                    text: `❌ Mentionne l'utilisateur à retirer\n\nExemple: ${prefix}antilink unallow @user`
                });
            }
            
            const target = mentioned[0];
            const allowedUsers = config.getSettings(groupId).allowedLinks || [];
            const index = allowedUsers.indexOf(target);
            
            if (index !== -1) {
                allowedUsers.splice(index, 1);
                config.updateGroupSetting(groupId, 'allowedLinks', allowedUsers);
                await sock.sendMessage(sender, {
                    text: `❌ @${target.split('@')[0]} n'est plus autorisé à envoyer des liens`,
                    mentions: [target]
                });
            } else {
                await sock.sendMessage(sender, {
                    text: `⚠️ @${target.split('@')[0]} n'était pas autorisé`,
                    mentions: [target]
                });
            }
        }
    },
    
    handleMessage: async (sock, msg, groupId, sender, isGroup) => {
        if (!isGroup) return;
        
        const settings = config.getSettings(groupId);
        if (!settings.antiLink) return;
        
        const groupMetadata = await sock.groupMetadata(groupId);
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .some(p => p.id === sender);
        
        if (isAdmin) return;
        
        const text = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || 
                    msg.message?.imageMessage?.caption || '';
        
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?)/gi;
        
        if (!urlRegex.test(text)) return;
        
        const allowedUsers = settings.allowedLinks || [];
        if (allowedUsers.includes(sender)) return;
        
        await sock.sendMessage(groupId, {
            delete: msg.key
        });
        
        if (!userWarnings.has(groupId)) {
            userWarnings.set(groupId, new Map());
        }
        
        const groupWarnings = userWarnings.get(groupId);
        const currentWarns = groupWarnings.get(sender) || 0;
        const newWarns = currentWarns + 1;
        
        if (newWarns >= 3) {
            await sock.sendMessage(groupId, {
                text: `🚨 *EXPULSION*\n\n@${sender.split('@')[0]} a été expulsé pour avoir envoyé des liens sans autorisation.`,
                mentions: [sender]
            });
            
            await sock.groupParticipantsUpdate(groupId, [sender], 'remove');
            groupWarnings.delete(sender);
        } else {
            groupWarnings.set(sender, newWarns);
            await sock.sendMessage(groupId, {
                text: `⛔ *LIEN INTERDIT*\n\n@${sender.split('@')[0]}, tu ne peux pas envoyer de liens sans l'autorisation des administrateurs.\n\n⚠️ Avertissement ${newWarns}/3`,
                mentions: [sender]
            });
        }
    }
};
