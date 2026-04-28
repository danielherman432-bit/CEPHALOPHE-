import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.join(__dirname, '../commands');
const startTime = Date.now();

function formatUptime() {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatRam() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = os.totalmem() / 1024 / 1024;
    return `${Math.round(used)}MB/${Math.round(total)}MB`;
}

function getDate() {
    const date = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${date.toLocaleDateString('en-CA').slice(5)} • ${days[date.getDay()]}`;
}

export default {
    name: 'menu',
    description: 'Affiche toutes les commandes disponibles',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        const botName = config.config.botName;
        
        const userDisplayName = '👑 Propriétaire';
        
        const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
        const categories = {};
        
        for (const file of commandFiles) {
            try {
                const commandPath = path.join(commandsDir, file);
                const command = await import(`file://${commandPath}`);
                if (command.default?.name) {
                    const category = command.default.category || 'general';
                    if (!categories[category]) categories[category] = [];
                    categories[category].push(command.default.name);
                }
            } catch (err) {}
        }
        
        const categoryOrder = ['general', 'media', 'group', 'download', 'converter', 'fun', 'admin', 'owner', 'premium', 'tools'];
        const categoryIcons = {
            general: '🌐', media: '🎬', group: '👥', download: '📥',
            converter: '🔄', fun: '🎮', admin: '👑', owner: '⚡',
            premium: '💎', tools: '🛠️'
        };
        const categoryNames = {
            general: 'GÉNÉRALES', media: 'MÉDIAS', group: 'GROUPE', download: 'TÉLÉCHARGEMENT',
            converter: 'CONVERTISSEURS', fun: 'DIVERTISSEMENT', admin: 'ADMIN', owner: 'PROPRIÉTAIRE',
            premium: 'PREMIUM', tools: 'OUTILS'
        };
        
        const uptime = formatUptime();
        const ram = formatRam();
        const date = getDate();
        
        let menuText = `╭──────────────────╮
│   ${botName} 🎯    │
├──────────────────┤
│ ${userDisplayName}
│ 📦 ${commandFiles.length} commandes
│ ⏱️ ${uptime}
│ 💾 ${ram}
│ 📅 ${date}
├──────────────────┤\n`;
        
        for (const cat of categoryOrder) {
            if (categories[cat] && categories[cat].length > 0) {
                const icon = categoryIcons[cat] || '📌';
                const name = categoryNames[cat] || cat.toUpperCase();
                menuText += `│ ${icon} ${name}\n`;
                const cmds = categories[cat];
                const line = cmds.map(c => `${prefix}${c}`).join(' • ');
                const maxLen = 18;
                if (line.length <= maxLen) {
                    menuText += `│ ${line}\n`;
                } else {
                    let currentLine = '';
                    for (const cmd of cmds) {
                        const cmdWithPrefix = `${prefix}${cmd}`;
                        if (currentLine.length + cmdWithPrefix.length + 2 <= maxLen) {
                            currentLine += (currentLine ? ' • ' : '') + cmdWithPrefix;
                        } else {
                            menuText += `│ ${currentLine}\n`;
                            currentLine = cmdWithPrefix;
                        }
                    }
                    if (currentLine) menuText += `│ ${currentLine}\n`;
                }
                menuText += `├──────────────────┤\n`;
            }
        }
        
        menuText += `│ 💡 ${prefix}help <commande>
│ 📬 @ShadowCrew
╰──────────────────╯`;
        
        const imagePath = path.join(__dirname, '../media/menu.png');
        const imageExists = fs.existsSync(imagePath);
        
        if (imageExists) {
            await sock.sendMessage(sender, {
                image: { url: imagePath },
                caption: menuText
            });
        } else {
            await sock.sendMessage(sender, { text: menuText });
        }
    }
};
