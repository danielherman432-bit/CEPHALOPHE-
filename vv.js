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
    name: 'vv',
    description: 'Dévoile un média en vue unique',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
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
            return await sock.sendMessage(sender, {
                text: `❌ Ce message n'est pas en vue unique`
            });
        }
        
        try {
            await sock.sendMessage(sender, {
                text: `⏳ Téléchargement du média...`
            });
            
            const mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            
            if (!mediaBuffer) {
                return await sock.sendMessage(sender, {
                    text: `❌ Impossible de télécharger le média`
                });
            }
            
            const timestamp = Date.now();
            let filePath = '';
            let caption = '';
            
            if (mediaType === 'image') {
                filePath = path.join(tempDir, `viewonce_${timestamp}.jpg`);
                fs.writeFileSync(filePath, mediaBuffer);
                caption = quoted.imageMessage?.caption || '';
                
                await sock.sendMessage(sender, {
                    image: { url: filePath },
                    caption: caption || '📸 *Média dévoilé*'
                });
            } else if (mediaType === 'video') {
                filePath = path.join(tempDir, `viewonce_${timestamp}.mp4`);
                fs.writeFileSync(filePath, mediaBuffer);
                caption = quoted.videoMessage?.caption || '';
                
                await sock.sendMessage(sender, {
                    video: { url: filePath },
                    caption: caption || '🎥 *Média dévoilé*'
                });
            } else if (mediaType === 'audio') {
                filePath = path.join(tempDir, `viewonce_${timestamp}.mp3`);
                fs.writeFileSync(filePath, mediaBuffer);
                
                await sock.sendMessage(sender, {
                    audio: { url: filePath },
                    mimetype: 'audio/mp4'
                });
            }
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            console.log(`✓ ViewOnce ${mediaType} dévoilé pour ${participant.split('@')[0]}`);
            
        } catch (error) {
            console.error('ViewOnce error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur: Impossible de dévoiler le média`
            });
        }
    }
};
