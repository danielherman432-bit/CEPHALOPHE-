import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, '../temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

export default {
    name: 'sticker',
    description: 'Transforme une image ou vidéo en sticker WhatsApp',
    adminOnly: false,
    category: 'media',
    execute: async (sock, msg, args, sender, isGroup, participant) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return await sock.sendMessage(sender, {
                text: `❌ Réponds à une image ou vidéo\n\nExemple: réponds à une photo avec !sticker`
            });
        }
        
        let mediaBuffer = null;
        let isVideo = false;
        
        if (quoted.imageMessage) {
            mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            isVideo = false;
        } else if (quoted.videoMessage) {
            const duration = quoted.videoMessage.seconds || 0;
            if (duration > 9) {
                return await sock.sendMessage(sender, {
                    text: `❌ La vidéo dépasse 9 secondes (${duration}s)\n\nLa durée maximale pour un sticker est de 9 secondes.`
                });
            }
            mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
            isVideo = true;
        } else {
            return await sock.sendMessage(sender, {
                text: `❌ Ce message ne contient pas d'image ou vidéo`
            });
        }
        
        if (!mediaBuffer) {
            return await sock.sendMessage(sender, {
                text: `❌ Impossible de télécharger le média`
            });
        }
        
        await sock.sendMessage(sender, {
            text: `⏳ Conversion en sticker...`
        });
        
        try {
            const timestamp = Date.now();
            let inputPath = path.join(tempDir, `sticker_${timestamp}.${isVideo ? 'mp4' : 'jpg'}`);
            let outputPath = path.join(tempDir, `sticker_${timestamp}.webp`);
            
            fs.writeFileSync(inputPath, mediaBuffer);
            
            if (isVideo) {
                await new Promise((resolve, reject) => {
                    const command = ffmpeg(inputPath)
                        .outputOptions([
                            '-vcodec libwebp',
                            '-vf scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15',
                            '-loop 0',
                            '-preset default',
                            '-an',
                            '-vsync 0',
                            '-s 512:512',
                            '-qscale 80',
                            '-lossless 0',
                            '-compression_level 6'
                        ])
                        .toFormat('webp');
                    
                    command.on('end', () => {
                        console.log('Video sticker created successfully');
                        resolve();
                    });
                    
                    command.on('error', (err) => {
                        console.error('FFmpeg error:', err);
                        reject(err);
                    });
                    
                    command.save(outputPath);
                });
            } else {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .outputOptions([
                            '-vcodec libwebp',
                            '-vf scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
                            '-loop 0',
                            '-preset default',
                            '-an',
                            '-vsync 0',
                            '-s 512:512',
                            '-qscale 80'
                        ])
                        .toFormat('webp')
                        .on('end', resolve)
                        .on('error', reject)
                        .save(outputPath);
                });
            }
            
            if (!fs.existsSync(outputPath)) {
                throw new Error('Le fichier sticker n\'a pas été créé');
            }
            
            const stickerBuffer = fs.readFileSync(outputPath);
            
            await sock.sendMessage(sender, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            });
            
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            
            const stickerInfo = `┌────────────────────┐
│   *SHADOWCREW*    │
│   ✦  Sticker  ✦   │
├────────────────────┤
│ 📛 *Nom:* ShadowCrew Sticker
│ ✍️ *Auteur:* @ShadowCrew
│ 🤖 *Bot:* ${config.config.botName}
│
│ 💫 *Digital Crew 243*
└────────────────────┘`;
            
            await sock.sendMessage(sender, { text: stickerInfo });
            
            console.log(`✓ Sticker ${isVideo ? 'animé' : 'statique'} envoyé par ${participant.split('@')[0]}`);
            
        } catch (error) {
            console.error('Sticker error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur lors de la conversion: ${error.message}`
            });
        }
    }
};
