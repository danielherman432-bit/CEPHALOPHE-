import config from '../config.js';

export default {
    name: 'supp',
    description: 'Supprime un message (répondre au message)',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return await sock.sendMessage(sender, {
                text: `❌ Réponds au message que tu veux supprimer\n\nExemple: réponds à un message avec !supp`
            });
        }
        
        const targetMessageId = msg.message.extendedTextMessage.contextInfo.stanzaId;
        const targetJid = msg.message.extendedTextMessage.contextInfo.participant || sender;
        
        if (isGroup) {
            const groupMetadata = await sock.groupMetadata(sender);
            const isAdmin = groupMetadata.participants
                .filter(p => p.admin)
                .some(p => p.id === participant);
            
            const isSenderOfMessage = targetJid === participant;
            
            if (!isAdmin && !isSenderOfMessage) {
                return await sock.sendMessage(sender, {
                    text: '❌ En groupe, seuls les admins ou l\'auteur du message peuvent le supprimer'
                });
            }
        }
        
        try {
            await sock.sendMessage(sender, {
                delete: {
                    remoteJid: sender,
                    fromMe: false,
                    id: targetMessageId,
                    participant: targetJid
                }
            });
            
            console.log(`✓ Message supprimé par ${participant.split('@')[0]} dans ${isGroup ? 'groupe' : 'privé'}`);
            
        } catch (error) {
            console.error('Delete error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Impossible de supprimer le message\n\nRaison: ${error.message || 'Le message est peut-être trop ancien'}`
            });
        }
    }
};
