import config from '../config.js';

export default {
    name: 'restart',
    description: 'Redémarre le bot',
    adminOnly: true,
    category: 'owner',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        await sock.sendMessage(sender, {
            text: `╭━━━ *REDÉMARRAGE* ━━━
┃
┃ 🔄 *Redémarrage du bot...*
┃
┃ ⏳ Le bot va se reconnecter dans quelques secondes
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
        });
        
        console.log('🔄 Redémarrage demandé par le propriétaire');
        
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    }
};
