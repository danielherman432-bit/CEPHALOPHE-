import config from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    name: 'pair',
    description: 'Connecte un nouveau numéro au bot',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        const number = args[0]?.replace(/[^0-9]/g, '');

        if (!number) {
            return await sock.sendMessage(sender, { 
                text: `❌ Utilisation: ${prefix}pair [numéro]\n\nExemple: ${prefix}pair 243971724264` 
            });
        }

        if (number.length < 10 || number.length > 15) {
            return await sock.sendMessage(sender, { 
                text: '❌ Numéro invalide. Format international sans + (ex: 243971724264)' 
            });
        }

        const sessionDir = path.join(process.cwd(), `sessions_${number}`);

        if (fs.existsSync(sessionDir)) {
            return await sock.sendMessage(sender, {
                text: `⚠️ Le numéro ${number} a déjà une session\n\nSupprime le dossier sessions_${number} pour recommencer.`
            });
        }

        await sock.sendMessage(sender, { 
            text: `⏳ Connexion de +${number}...\n\nGénération du code...` 
        });

        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            
            const pairSock = makeWASocket({
                version,
                auth: state,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 10000,
                connectTimeoutMs: 60000,
            });

            pairSock.ev.on('creds.update', saveCreds);

            let pairingCode = null;
            let isConnected = false;

            pairSock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    isConnected = true;
                    await sock.sendMessage(sender, {
                        text: `✅ *SUCCÈS !*\n\nLe bot est maintenant connecté à +${number}\n\n📁 Session sauvegardée dans: sessions_${number}\n\n🎉 Le bot est prêt avec ce numéro !`
                    });
                    pairSock.ws?.close();
                } else if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (!isConnected && statusCode !== DisconnectReason.loggedOut) {
                        await sock.sendMessage(sender, {
                            text: `❌ Échec de connexion pour +${number}\n\nRéessaie dans quelques instants.`
                        });
                        if (fs.existsSync(sessionDir)) {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                        }
                    }
                    pairSock.ws?.close();
                }
            });

            setTimeout(async () => {
                if (!isConnected && !pairingCode) {
                    try {
                        pairingCode = await pairSock.requestPairingCode(number, 'DIGICREW');
                        await sock.sendMessage(sender, {
                            text: `╭━━━ *PAIRING CODE* ━━━
┃
┃ 🔑 *Code:* ${pairingCode}
┃ 📱 *Numéro:* +${number}
┃
┃ 📌 *Instructions:*
┃
┃ 1️⃣ WhatsApp > Paramètres
┃ 2️⃣ Appareils connectés
┃ 3️⃣ Connecter un appareil
┃ 4️⃣ Entrer le code
┃
┃ ⏳ Valable 60 secondes
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`
                        });
                    } catch (err) {
                        if (!isConnected) {
                            await sock.sendMessage(sender, {
                                text: `❌ Erreur: ${err.message}`
                            });
                            pairSock.ws?.close();
                            if (fs.existsSync(sessionDir)) {
                                fs.rmSync(sessionDir, { recursive: true, force: true });
                            }
                        }
                    }
                }
            }, 2000);

            setTimeout(() => {
                if (!isConnected) {
                    pairSock.ws?.close();
                }
            }, 60000);

        } catch (error) {
            console.error('Pairing error:', error);
            await sock.sendMessage(sender, { 
                text: `❌ Erreur: ${error.message || 'Impossible de connecter le numéro'}` 
            });
        }
    }
};
