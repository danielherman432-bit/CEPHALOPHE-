import config from '../config.js';

export default {
    name: 'demote',
    description: 'Retire le statut admin à un membre du groupe',
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
                text: '❌ Seuls les admins du groupe peuvent rétrograder des membres'
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
                text: `╭━━━ *RÉTROGRADER* ━━━
┃
┃ ❌ Aucun membre ciblé
┃
┃ 📖 *Utilisation:*
┃ ${prefix}demote @utilisateur
┃ ${prefix}demote 243XXXXXXXX
┃ (répondre au message du membre)
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
        }
        
        if (targetJid === sock.user.id) {
            return await sock.sendMessage(sender, {
                text: '❌ Je ne peux pas me rétrograder moi-même !'
            });
        }
        
        if (targetJid === senderJid) {
            return await sock.sendMessage(sender, {
                text: '❌ Tu ne peux pas te rétrograder toi-même'
            });
        }
        
        const isTargetAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .some(p => p.id === targetJid);
        
        if (!isTargetAdmin) {
            return await sock.sendMessage(sender, {
                text: `❌ @${targetJid.split('@')[0]} n'est pas admin du groupe`,
                mentions: [targetJid]
            });
        }
        
        const targetNumber = targetJid.split('@')[0];
        
        await sock.sendMessage(sender, {
            text: `⏳ Rétrogradation de @${targetNumber}...`,
            mentions: [targetJid]
        });
        
        try {
            await sock.groupParticipantsUpdate(sender, [targetJid], 'demote');
            
            await sock.sendMessage(sender, {
                text: `✅ *Admin retiré*\n\n👤 @${targetNumber} n'est plus admin du groupe.`,
                mentions: [targetJid]
            });
            
        } catch (error) {
            console.error('Demote error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur: Impossible de rétrograder @${targetNumber}\n\nRaison: ${error.message || 'Le bot n\'a pas les droits suffisants'}`,
                mentions: [targetJid]
            });
        }
    }
};
