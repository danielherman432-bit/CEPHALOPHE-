import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.join(__dirname, '../commands');

export default {
    name: 'cmd',
    description: 'Gère les commandes du bot (install/supprimer)',
    adminOnly: true,
    category: 'owner',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        const action = args[0]?.toLowerCase();

        if (!action || !['install', 'remove', 'list'].includes(action)) {
            return await sock.sendMessage(sender, {
                text: `╭━ *GESTION DES COMMANDES* ━
┃
┃ 📖 *Commandes:*
┃ ${prefix}cmd install [nom.js] → Installer une cmd
┃ ${prefix}cmd remove [nom.js]  → Supprimer une cmd
┃ ${prefix}cmd list             → Lister les cmd
┃
┃ 📝 *Exemples:*
┃ Réponds à un code avec ${prefix}cmd install test.js
┃ ${prefix}cmd remove ping.js
┃ ${prefix}cmd list
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
        }

        if (action === 'install') {
            let fileName = args[1];
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            let code = '';

            if (quoted?.conversation) code = quoted.conversation;
            else if (quoted?.extendedTextMessage?.text) code = quoted.extendedTextMessage.text;
            else if (args.length > 2) code = args.slice(2).join(' ');

            if (!fileName) {
                return await sock.sendMessage(sender, {
                    text: `❌ Utilisation: ${prefix}cmd install [nom.js]\n\nRéponds au code de la commande.`
                });
            }

            if (!fileName.endsWith('.js')) fileName += '.js';

            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                return await sock.sendMessage(sender, { text: '❌ Nom de fichier invalide' });
            }

            if (!code) {
                return await sock.sendMessage(sender, {
                    text: '❌ Aucun code trouvé\n\nRéponds à un message contenant le code de la commande'
                });
            }

            const requiredExports = ['export default', 'name:', 'execute:'];
            const hasExports = requiredExports.some(exp => code.includes(exp));

            if (!hasExports) {
                return await sock.sendMessage(sender, {
                    text: '❌ Code invalide: format de commande non reconnu'
                });
            }

            const filePath = path.join(commandsDir, fileName);

            if (fs.existsSync(filePath)) {
                return await sock.sendMessage(sender, {
                    text: `⚠️ La commande ${fileName} existe déjà\n\nUtilise ${prefix}cmd remove ${fileName} pour la supprimer d'abord.`
                });
            }

            try {
                fs.writeFileSync(filePath, code);
                const stats = fs.statSync(filePath);

                await sock.sendMessage(sender, {
                    text: `╭━━━ *CMD INSTALLÉE* ━━━
┃
┃ ✅ *Fichier:* ${fileName}
┃ 📊 *Taille:* ${(stats.size / 1024).toFixed(2)} KB
┃
┃ 🔄 *Redémarrage du bot...*
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
                });

                console.log(`✓ Commande installée: ${fileName}`);
                setTimeout(() => process.exit(0), 2000);
            } catch (error) {
                await sock.sendMessage(sender, {
                    text: `❌ Erreur: ${error.message}`
                });
            }
        }

        else if (action === 'remove') {
            let fileName = args[1];

            if (!fileName) {
                return await sock.sendMessage(sender, {
                    text: `❌ Utilisation: ${prefix}cmd remove [nom.js]\n\nExemple: ${prefix}cmd remove ping.js`
                });
            }

            if (!fileName.endsWith('.js')) fileName += '.js';

            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                return await sock.sendMessage(sender, { text: '❌ Nom de fichier invalide' });
            }

            const filePath = path.join(commandsDir, fileName);

            if (!fs.existsSync(filePath)) {
                return await sock.sendMessage(sender, {
                    text: `❌ La commande ${fileName} n'existe pas`
                });
            }

            const stats = fs.statSync(filePath);

            try {
                fs.unlinkSync(filePath);

                await sock.sendMessage(sender, {
                    text: `╭━━━ *CMD SUPPRIMÉE* ━━━
┃
┃ ❌ *Fichier:* ${fileName}
┃ 📊 *Taille:* ${(stats.size / 1024).toFixed(2)} KB
┃
┃ 🔄 *Redémarrage du bot...*
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
                });

                console.log(`✓ Commande supprimée: ${fileName}`);
                setTimeout(() => process.exit(0), 2000);
            } catch (error) {
                await sock.sendMessage(sender, {
                    text: `❌ Erreur: ${error.message}`
                });
            }
        }

        else if (action === 'list') {
            const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

            if (files.length === 0) {
                return await sock.sendMessage(sender, {
                    text: `📁 Aucune commande trouvée dans le dossier commands/`
                });
            }

            let listText = `╭━━━ *COMMANDES INSTALLÉES* ━━━
┃
┃ 📦 *Total:* ${files.length} commandes
┃\n`;

            for (const file of files) {
                const filePath = path.join(commandsDir, file);
                const stats = fs.statSync(filePath);
                listText += `┃ 📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)\n`;
            }

            listText += `┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`;

            await sock.sendMessage(sender, { text: listText });
        }
    }
};
