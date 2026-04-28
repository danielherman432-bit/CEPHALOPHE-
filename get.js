import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'get',
    description: 'Récupère un fichier de commande',
    adminOnly: true,
    category: 'owner',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        let fileName = args[0];

        const commandsDir = path.join(__dirname, '../commands');
        const mediaDir = path.join(__dirname, '../media');

        if (!fileName) {
            let commandsList = [];
            try {
                commandsList = fs.readdirSync(commandsDir)
                    .filter(f => f.endsWith('.js'))
                    .map(f => `• ${f}`);
            } catch (err) {}

            return await sock.sendMessage(sender, {
                text: `╭━━━ *GET FILE* ━━━
┃
┃ ❌ Spécifie un fichier
┃
┃ 📂 *Commandes dispo:*
┃
${commandsList.slice(0, 15).join('\n')}
┃
┃ 📌 *Exemple:* ${prefix}get menu.js
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
            });
        }

        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return await sock.sendMessage(sender, {
                text: '❌ Nom de fichier invalide'
            });
        }

        const safeName = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
        let filePath = path.join(commandsDir, safeName);
        let folder = 'commands';

        if (!fs.existsSync(filePath)) {
            filePath = path.join(mediaDir, safeName);
            folder = 'media';
        }

        if (!fs.existsSync(filePath)) {
            let commandsList = [];
            try {
                commandsList = fs.readdirSync(commandsDir)
                    .filter(f => f.endsWith('.js'))
                    .map(f => `• ${f}`);
            } catch (err) {}

            return await sock.sendMessage(sender, {
                text: `╭━━━ *FILE NOT FOUND* ━━━
┃
┃ ❌ ${safeName} n'existe pas
┃
┃ 📂 *Commandes:*
┃
${commandsList.slice(0, 15).join('\n')}
┃
╰━━━━━━━━━━━━━━━`
            });
        }

        const stats = fs.statSync(filePath);
        
        await sock.sendMessage(sender, {
            document: fs.readFileSync(filePath),
            fileName: safeName,
            mimetype: 'application/javascript',
            caption: `✅ *${folder}/${safeName}*\n📊 ${(stats.size / 1024).toFixed(2)} KB`
        });
    }
};
