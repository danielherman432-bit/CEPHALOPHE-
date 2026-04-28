import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import axios from 'axios';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, '../temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

export default {
    name: 'url',
    description: 'Génère un lien Catbox pour un média (photo, vidéo, audio)',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return await sock.sendMessage(sender, {
                text: `❌ Réponds à un média (photo, vidéo, audio)\n\nExemple: réponds à une image avec !url`
            });
        }
        
        let mediaBuffer = null;
        let mediaType = '';
        let extension = '';
        
        if (quoted.imageMessage) {
            mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            mediaType = 'image';
            extension = '.jpg';
        } else if (quoted.videoMessage) {
            mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            mediaType = 'video';
            extension = '.mp4';
        } else if (quoted.audioMessage) {
            mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            mediaType = 'audio';
            extension = '.mp3';
        } else {
            return await sock.sendMessage(sender, {
                text: `❌ Ce message ne contient pas de média téléchargeable`
            });
        }
        
        if (!mediaBuffer) {
            return await sock.sendMessage(sender, {
                text: `❌ Impossible de télécharger le média`
            });
        }
        
        await sock.sendMessage(sender, {
            text: `⏳ Téléchargement vers Catbox...`
        });
        
        try {
            const tempFilePath = path.join(tempDir, `catbox_${Date.now()}${extension}`);
            fs.writeFileSync(tempFilePath, mediaBuffer);
            
            const formData = new FormData();
            formData.append('fileToUpload', fs.createReadStream(tempFilePath));
            formData.append('reqtype', 'fileupload');
            
            const response = await axios.post('https://catbox.moe/user/api.php', formData, {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 30000
            });
            
            fs.unlinkSync(tempFilePath);
            
            const url = response.data.trim();
            
            const mediaEmoji = mediaType === 'image' ? '🖼️' : mediaType === 'video' ? '🎥' : '🎵';
            
            const resultText = `╭━━━ *CATBOX UPLOAD* ━━━
┃
┃ ${mediaEmoji} *Type:* ${mediaType}
┃ 🔗 *Lien:* ${url}
┃
┃ 📋 *Copie:* ${url}
┃
╰━━━━━━━━━━━━━━━

> ${config.config.botName}`;
            
            await sock.sendMessage(sender, { text: resultText });
            
        } catch (error) {
            console.error('Catbox error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur lors de l'upload vers Catbox\n\n${error.message}`
            });
        }
    }
};
