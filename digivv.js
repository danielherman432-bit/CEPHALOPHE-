import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, '../temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

export default {
    name: 'digivv',
    description: 'Dévoile un média en vue unique et l\'envoie au propriétaire',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const ownerJid = config.config.ownerJid;
        const userNumber = participant.split('@')[0];
        
        if (!quoted) {
            return await sock.sendMessage(sender, {
                text: `❌ Réponds à un message en vue unique\n\nExemple: réponds à une photo/vidéo view once avec !vv`
            });
        }
        
        let isViewOnce = false;
        let mediaType = null;
        
        if (quoted.imageMessage?.viewOnce === true) {
            isViewOnce = true;
            mediaType = 'image';
        } else if (quoted.videoMessage?.viewOnce === true) {
            isViewOnce = true;
            mediaType = 'video';
        } else if (quoted.audioMessage?.viewOnce === true) {
            isViewOnce = true;
            mediaType = 'audio';
        }
        
        if (!isViewOnce) {
            return;
        }
        
        try {
            const mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            
            if (!mediaBuffer) return;
            
            const timestamp = Date.now();
            let filePath = '';
            let caption = '';
            let mediaInfo = '';
            
            if (mediaType === 'image') {
                filePath = path.join(tempDir, `viewonce_${timestamp}.jpg`);
                fs.writeFileSync(filePath, mediaBuffer);
                caption = quoted.imageMessage?.caption || '';
                mediaInfo = `📸 *Image vue unique*`;
            } else if (mediaType === 'video') {
                filePath = path.join(tempDir, `viewonce_${timestamp}.mp4`);
                fs.writeFileSync(filePath, mediaBuffer);
                caption = quoted.videoMessage?.caption || '';
                mediaInfo = `🎥 *Vidéo vue unique*`;
            } else if (mediaType === 'audio') {
                filePath = path.join(tempDir, `viewonce_${timestamp}.mp3`);
                fs.writeFileSync(filePath, mediaBuffer);
                mediaInfo = `🎵 *Audio vue unique*`;
            }
            
            const infoText = `╭━━━ *VIEW ONCE* ━━━
┃
┃ ${mediaInfo}
┃ 👤 *De:* ${userNumber}
┃ 📱 *Chat:* ${isGroup ? 'Groupe' : 'Privé'}
┃
╰━━━━━━━━━━━━━━━
${caption ? `\n📝 *Légende:* ${caption}` : ''}`;
            
            if (mediaType === 'image') {
                await sock.sendMessage(ownerJid, {
                    image: { url: filePath },
                    caption: infoText
                });
            } else if (mediaType === 'video') {
                await sock.sendMessage(ownerJid, {
                    video: { url: filePath },
                    caption: infoText
                });
            } else if (mediaType === 'audio') {
                await sock.sendMessage(ownerJid, {
                    audio: { url: filePath },
                    mimetype: 'audio/mp4',
                    ptt: false
                });
                await sock.sendMessage(ownerJid, { text: infoText });
            }
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            console.log(chalk.green(`✓ ViewOnce ${mediaType} de ${userNumber} envoyé à l'owner`));
            
        } catch (error) {
            console.error('ViewOnce error:', error);
        }
    }
};
