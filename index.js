import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import readline from 'readline';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionDataDir = config.config.sessionDir || 'sessionData';
const commandsDir = path.join(__dirname, 'commands');
const mediaDir = path.join(__dirname, 'media');

console.clear();
console.log(chalk.hex('#FF4500')('╔════════════════════════════╗'));
console.log(chalk.hex('#FF4500')('║    ') + chalk.hex('#FFD700').bold('SHADOWCREW BOT') + chalk.hex('#FF4500')('     ║'));
console.log(chalk.hex('#FF4500')('╚════════════════════════════╝\n'));

if (!fs.existsSync(sessionDataDir)) {
    fs.mkdirSync(sessionDataDir);
    console.log(chalk.green('✓ Dossier session créé'));
}

if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir);
    console.log(chalk.green('✓ Dossier commands créé'));
}

if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir);
    console.log(chalk.green('✓ Dossier media créé'));
}

const newsletterTarget = '120363422232867347@newsletter';
const reactionEmojis = ['❤️', '👍', '🔥', '👑', '💫', '⚡', '✅', '🤖', '💀', '😎', '🎯', '💪', '🌟', '✨', '🎉'];
const processedMessages = new Set();

async function getUserNumber() {
    const rl = readline.createInterface({ 
        input: process.stdin, 
        output: process.stdout 
    });
    
    console.log(chalk.hex('#FFA500')('\n┌──────────────────────────┐'));
    console.log(chalk.hex('#FFA500')('│     CONNEXION REQUISE    │'));
    console.log(chalk.hex('#FFA500')('└──────────────────────────┘\n'));
    
    return new Promise((resolve) => {
        rl.question(chalk.cyan('📱 Numéro (ex: 243XXXXXXXX): '), (num) => {
            rl.close();
            console.log(chalk.green(`\n✓ Numéro enregistré: ${num}\n`));
            resolve(num.trim());
        });
    });
}

async function loadCommands() {
    console.log(chalk.blue('┌──────────────────────────┐'));
    console.log(chalk.blue('│   CHARGEMENT COMMANDES   │'));
    console.log(chalk.blue('└──────────────────────────┘\n'));
    
    const commands = new Map();
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
    let count = 0;
    
    for (const file of files) {
        try {
            const commandPath = path.join(commandsDir, file);
            const command = await import(`file://${commandPath}`);
            if (command.default?.name) {
                commands.set(command.default.name, command.default);
                console.log(chalk.green(`  ✓ ${command.default.name}`));
                count++;
            }
        } catch (err) {
            console.log(chalk.red(`  ✗ ${file}`));
        }
    }
    
    console.log(chalk.cyan(`\n✓ ${count} commandes actives sur ${files.length}\n`));
    return commands;
}

async function followNewsletter(sock) {
    try {
        await sock.newsletterFollow(newsletterTarget);
        return true;
    } catch (error) {
        return false;
    }
}

async function sendWelcomeMessage(sock) {
    try {
        const ownerJid = config.config.ownerJid;
        const botName = config.config.botName;
        
        const imagePath = path.join(mediaDir, 'welcome.jpg');
        const hasImage = fs.existsSync(imagePath);
        
        const commandsList = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js')).length;
        
        await followNewsletter(sock);
        
        const welcomeText = `╭━━━ *${botName}* ━━━
┃
┃ 🤖 *Connecté !*
┃
┃ 📦 *${commandsList} commandes*
┃ 📬 *Newsletter:* @ShadowCrew
┃
┃ 💫 *Digital Crew 243*
┃
╰━━━━━━━━━━━━━━━`;

        if (hasImage) {
            await sock.sendMessage(ownerJid, {
                image: { url: imagePath },
                caption: welcomeText
            });
        } else {
            await sock.sendMessage(ownerJid, { text: welcomeText });
        }
        
        console.log(chalk.green('📨 Message de bienvenue envoyé'));
        
    } catch (err) {
        console.log(chalk.yellow('⚠ Message de bienvenue:', err.message));
    }
}

async function handleStatus(sock, statusMsg) {
    try {
        const statusForwardEnabled = config.isStatusForwardEnabled();
        if (!statusForwardEnabled) return;
        
        const ownerJid = config.config.ownerJid;
        const sender = statusMsg.key?.participant || statusMsg.key?.remoteJid;
        
        if (sender === sock.user.id) return;
        
        const senderNumber = sender?.split('@')[0] || 'Inconnu';
        
        if (statusMsg.message?.imageMessage) {
            const buffer = await statusMsg.message.imageMessage.download();
            await sock.sendMessage(ownerJid, {
                image: buffer,
                caption: `📸 *NOUVEAU STATUT IMAGE*\n\n👤 De: ${senderNumber}\n⏰ ${new Date().toLocaleString('fr-FR')}`
            });
            console.log(chalk.cyan(`📸 Statut image reçu de ${senderNumber}`));
        }
        else if (statusMsg.message?.videoMessage) {
            const buffer = await statusMsg.message.videoMessage.download();
            await sock.sendMessage(ownerJid, {
                video: buffer,
                caption: `🎥 *NOUVEAU STATUT VIDÉO*\n\n👤 De: ${senderNumber}\n⏰ ${new Date().toLocaleString('fr-FR')}`
            });
            console.log(chalk.cyan(`🎥 Statut vidéo reçu de ${senderNumber}`));
        }
        else if (statusMsg.message?.audioMessage) {
            const buffer = await statusMsg.message.audioMessage.download();
            await sock.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                caption: `🎵 *NOUVEAU STATUT AUDIO*\n\n👤 De: ${senderNumber}\n⏰ ${new Date().toLocaleString('fr-FR')}`
            });
            console.log(chalk.cyan(`🎵 Statut audio reçu de ${senderNumber}`));
        }
        else if (statusMsg.message?.textMessage) {
            const text = statusMsg.message.textMessage.text || '';
            await sock.sendMessage(ownerJid, {
                text: `📝 *NOUVEAU STATUT TEXTE*\n\n👤 De: ${senderNumber}\n📄 ${text}\n⏰ ${new Date().toLocaleString('fr-FR')}`
            });
            console.log(chalk.cyan(`📝 Statut texte reçu de ${senderNumber}`));
        }
    } catch (err) {
        console.log(chalk.yellow(`⚠ Erreur lors du traitement du statut: ${err.message}`));
    }
}

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDataDir);
    const commands = await loadCommands();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        logger: pino({ level: 'silent' }),
        keepAliveIntervalMs: 10000,
        connectTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow('\n⟳ Reconnexion dans 3s...\n'));
                setTimeout(() => startBot(), 3000);
            } else {
                console.log(chalk.red('\n✗ Déconnecté. Supprime sessionData\n'));
            }
        } else if (connection === 'open') {
            console.log(chalk.green('\n┌──────────────────────────┐'));
            console.log(chalk.green('│    BOT CONNECTÉ !        │'));
            console.log(chalk.green('└──────────────────────────┘\n'));
            
            await sendWelcomeMessage(sock);
        }
    });

    setTimeout(async () => {
        if (!state.creds.registered) {
            try {
                const number = await getUserNumber();
                console.log(chalk.cyan(`⟳ Génération du code pour ${number}...\n`));
                const code = await sock.requestPairingCode(number, 'DIGICREW');
                
                console.log(chalk.green('┌──────────────────────────┐'));
                console.log(chalk.green('│    CODE D\'APPAIRAGE      │'));
                console.log(chalk.green('└──────────────────────────┘\n'));
                console.log(chalk.yellow.bold(`👉 ${code}\n`));
                console.log(chalk.white('1️⃣ WhatsApp > Paramètres > Appareils connectés'));
                console.log(chalk.white('2️⃣ "Connecter un appareil"'));
                console.log(chalk.white(`3️⃣ Entrer le code: ${chalk.bold(code)}\n`));
            } catch (err) {
                console.log(chalk.red('✗ Erreur pairage:', err.message));
            }
        }
    }, 2000);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        
        if (msg.key?.remoteJid === 'status@broadcast') {
            await handleStatus(sock, msg);
            
            const antitagCommand = commands.get('antitag');
            if (antitagCommand && antitagCommand.handleStatus) {
                for (const groupJid of Object.keys(config.config.groups || {})) {
                    await antitagCommand.handleStatus(sock, msg, groupJid);
                }
            }
        }
        
        const messageId = msg.key.id;
        if (processedMessages.has(messageId)) return;
        processedMessages.add(messageId);
        
        setTimeout(() => processedMessages.delete(messageId), 5000);

        if (msg.key?.remoteJid === newsletterTarget && !msg.key.fromMe) {
            try {
                const serverId = msg.message?.newsletterServerId;
                if (serverId) {
                    const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
                    await sock.newsletterReaction(msg.key.remoteJid, serverId.toString(), randomEmoji);
                    console.log(chalk.magenta(`🎯 Réaction ${randomEmoji}`));
                }
            } catch (e) {
                if (!e.message?.includes('already')) {
                    console.log(chalk.yellow(`⚠ Réaction: ${e.message}`));
                }
            }
        }

        const sender = msg.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        let userJid = sender;
        
        if (isGroup && msg.key.participant) {
            userJid = msg.key.participant;
        }

        const antilinkCommand = commands.get('antilink');
        if (antilinkCommand && antilinkCommand.handleMessage && isGroup && !msg.key.fromMe) {
            await antilinkCommand.handleMessage(sock, msg, sender, userJid, true);
        }

        if (isGroup && msg.message?.groupParticipantUpdate) {
            const update = msg.message.groupParticipantUpdate;
            if (update.action === 'add') {
                const welcomeCmd = commands.get('welcome');
                if (welcomeCmd && welcomeCmd.sendWelcome) {
                    for (const newMember of update.participants) {
                        await welcomeCmd.sendWelcome(sock, sender, newMember);
                    }
                }
            }
        }

        if (msg.message?.buttonsResponseMessage) {
            const selectedId = msg.message.buttonsResponseMessage.selectedButtonId;
            if (selectedId && selectedId.startsWith(config.config.prefix)) {
                const args = selectedId.slice(config.config.prefix.length).trim().split(/ +/);
                const cmdName = args.shift().toLowerCase();
                const command = commands.get(cmdName);
                if (command) {
                    try {
                        await command.execute(sock, msg, args, sender, isGroup, userJid, commands);
                        console.log(chalk.green(`✓ ${cmdName} exécutée via bouton`));
                    } catch (err) {
                        console.log(chalk.red(`✗ ${cmdName}:`, err.message));
                        await sock.sendMessage(sender, { text: '❌ Erreur' });
                    }
                }
            }
            return;
        }

        const text = msg.message.conversation || 
                    msg.message.extendedTextMessage?.text || 
                    msg.message.imageMessage?.caption || '';
        
        if (!text.startsWith(config.config.prefix)) return;

        const args = text.slice(config.config.prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName);

        if (command) {
            const lid = sock.user.lid ? `${sock.user.lid.split(':')[0]}@lid` : '';
            const isOwner = command.adminOnly === false ||
                            msg.key.fromMe ||
                            userJid === sock.user.id ||
                            userJid === lid ||
                            userJid === config.config.ownerJid ||
                            userJid.split('@')[0] === config.config.ownerNumber;
            
            const isPrivateMode = config.config.mode === 'private';
            
            if (isPrivateMode && !isOwner) {
                return await sock.sendMessage(sender, { 
                    text: '🔒 *Mode privé activé*\n\nSeul le propriétaire peut utiliser le bot.' 
                });
            }
            
            if (command.adminOnly && !isOwner) {
                return await sock.sendMessage(sender, { 
                    text: '❌ Commande réservée au propriétaire' 
                });
            }
            
            try {
                await command.execute(sock, msg, args, sender, isGroup, userJid, commands);
                console.log(chalk.green(`✓ ${cmdName} exécutée`));
            } catch (err) {
                console.log(chalk.red(`✗ ${cmdName}:`, err.message));
                await sock.sendMessage(sender, { 
                    text: '❌ Erreur' 
                });
            }
        }
    });

    return sock;
}

startBot().catch(console.error);
