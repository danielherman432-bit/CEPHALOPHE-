import config from '../config.js';

export default {
    name: 'setprefix',
    description: 'Change le préfixe du bot',
    adminOnly: true,
    category: 'owner',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const oldPrefix = config.config.prefix;
        const newPrefix = args[0];

        if (!newPrefix) {
            return await sock.sendMessage(sender, {
                text: `╭━━━ *CHANGER PRÉFIXE* ━━━
┃
┃ 📌 *Préfixe actuel:* ${oldPrefix}
┃
┃ 📖 *Utilisation:* ${oldPrefix}setprefix [nouveau]
┃
┃ 📝 *Exemple:* ${oldPrefix}setprefix .
┃ ${oldPrefix}setprefix /
┃ ${oldPrefix}setprefix ?
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
            });
        }

        if (newPrefix.length > 3) {
            return await sock.sendMessage(sender, {
                text: '❌ Le préfixe ne doit pas dépasser 3 caractères'
            });
        }

        config.setPrefix(newPrefix);

        await sock.sendMessage(sender, {
            text: `╭━━━ *PRÉFIXE CHANGÉ* ━━━
┃
┃ ✅ *Ancien:* ${oldPrefix}
┃ ✅ *Nouveau:* ${newPrefix}
┃
┃ 📌 Dès maintenant, utilise ${newPrefix} pour toutes les commandes
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
        });
    }
};
