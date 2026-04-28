import config from '../config.js';

export default {
    name: 'kick',
    description: 'Expulse un membre du groupe',
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
        const senderJid = participant;
        
        const isGroupAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .some(p => p.id === senderJid);
        
        if (!isGroupAdmin) {
            return await sock.sendMessage(sender, {
                text: '❌ Seuls les admins du groupe peuvent expulser des membres'
            });
        }
        
        let targetJid = null;
        
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentioned && mentioned.length > 0) {
            targetJid = mentioned[0];
        }
        
        if (!targetJid && args.length > 0) {
            const number = args[0].replace(/[^0-9]/g, '');
            if (number.length >= 10 && number.length <= 15) {
                targetJid = `${number}@s.whatsapp.net`;
            }
        }
        
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!targetJid && quotedParticipant) {
            targetJid = quotedParticipant;
        }
        
        if (!targetJid) {
            return await sock.sendMessage(sender, {
                text: `╭━━━ *EXPULSER* ━━━
┃
┃ ❌ Aucun membre ciblé
┃
┃ 📖 *Utilisation:*
┃ ${prefix}kick @utilisateur
┃ ${prefix}kick 243XXXXXXXX
┃ (répondre au message du membre)
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
        }
        
        if (targetJid === sock.user.id) {
            return await sock.sendMessage(sender, {
                text: '❌ Je ne peux pas m\'expulser moi-même !'
            });
        }
        
        if (targetJid === senderJid) {
            return await sock.sendMessage(sender, {
                text: '❌ Tu ne peux pas t\'expulser toi-même'
            });
        }
        
        const isTargetAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .some(p => p.id === targetJid);
        
        if (isTargetAdmin) {
            return await sock.sendMessage(sender, {
                text: `❌ Impossible d'expulser un admin du groupe`
            });
        }
        
        const targetNumber = targetJid.split('@')[0];
        
        await sock.sendMessage(sender, {
            text: `⏳ Expulsion de @${targetNumber}...`,
            mentions: [targetJid]
        });
        
        try {
            await sock.groupParticipantsUpdate(sender, [targetJid], 'remove');
            
            await sock.sendMessage(sender, {
                text: `✅ *Membre expulsé*\n\n👤 @${targetNumber} a été retiré du groupe.`,
                mentions: [targetJid]
            });
            
        } catch (error) {
            console.error('Kick error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur: Impossible d'expulser @${targetNumber}\n\nRaison: ${error.message || 'Le bot n\'a pas les droits suffisants'}`,
                mentions: [targetJid]
            });
        }
    }
};
