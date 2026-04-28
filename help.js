import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.join(__dirname, '../commands');

export default {
    name: 'help',
    description: 'Affiche l\'aide détaillée des commandes',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const prefix = config.config.prefix;
        const cmdName = args[0]?.toLowerCase();
        
        const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        const commandsList = [];
        
        for (const file of commandFiles) {
            try {
                const commandPath = path.join(commandsDir, file);
                const command = await import(`file://${commandPath}`);
                if (command.default?.name) {
                    commandsList.push({
                        name: command.default.name,
                        description: command.default.description || 'Aucune description',
                        category: command.default.category || 'general',
                        adminOnly: command.default.adminOnly || false
                    });
                }
            } catch (err) {}
        }
        
        if (cmdName) {
            const cmd = commandsList.find(c => c.name === cmdName);
            
            if (!cmd) {
                return await sock.sendMessage(sender, {
                    text: `❌ Commande "${cmdName}" introuvable\n\nTape ${prefix}help pour voir toutes les commandes`
                });
            }
            
            const helpText = `╭━━━ *AIDE: ${prefix}${cmd.name}* ━━━
┃
┃ 📝 *Description:* ${cmd.description}
┃ 🔧 *Catégorie:* ${cmd.category === 'owner' ? '👑 Propriétaire' : cmd.category === 'group' ? '👥 Groupe' : '🌍 Général'}
┃ 🔒 *Restriction:* ${cmd.adminOnly ? '🔐 Propriétaire uniquement' : '✅ Tout le monde'}
┃
┃ 📖 *Utilisation:*
┃ ${prefix}${cmd.name}
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`;
            
            return await sock.sendMessage(sender, { text: helpText });
        }
        
        const generalCmds = commandsList.filter(c => !c.adminOnly && c.category !== 'owner');
        const adminCmds = commandsList.filter(c => c.adminOnly);
        const groupCmds = commandsList.filter(c => c.category === 'group' && !c.adminOnly);
        
        let menuText = `╭━━━ *${config.config.botName}* ━━━
┃
┃ 🤖 *Bot WhatsApp Multifonction*
┃ 📌 *Préfixe:* ${prefix}
┃ 📦 *Total:* ${commandsList.length} commandes
┃
━━━━━━━━━━━━━━━━━
┃ 🌍 *COMMANDES GÉNÉRALES*
┃
${generalCmds.slice(0, 10).map(c => `┃ • ${prefix}${c.name.padEnd(12)} → ${c.description}`).join('\n')}
${generalCmds.length > 10 ? `┃
┃ ... et ${generalCmds.length - 10} autres (${prefix}help [commande])` : ''}

${groupCmds.length > 0 ? `━━━━━━━━━━━━━━━━━
┃ 👥 *COMMANDES GROUPE*
┃
${groupCmds.slice(0, 8).map(c => `┃ • ${prefix}${c.name.padEnd(12)} → ${c.description}`).join('\n')}
` : ''}

${adminCmds.length > 0 ? `━━━━━━━━━━━━━━━━━
┃ 👑 *COMMANDES PROPRIÉTAIRE*
┃
${adminCmds.slice(0, 8).map(c => `┃ • ${prefix}${c.name.padEnd(12)} → ${c.description}`).join('\n')}
` : ''}

━━━━━━━━━━━━━━━━━
┃ 💡 *Aide:* ${prefix}help [commande]
┃ 📬 *Newsletter:* @ShadowCrew
┃
╰━━━━━━━━━━━━━━━

> Always Forward • Digital Crew`;

        await sock.sendMessage(sender, { text: menuText });
    }
};
