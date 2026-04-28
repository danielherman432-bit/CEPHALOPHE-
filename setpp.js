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
    name: 'setpp',
    description: 'Change la photo de profil en répondant à une image',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return await sock.sendMessage(sender, {
                text: `❌ Réponds à une image\n\nExemple: réponds à une photo avec !setpp`
            });
        }
        
        let mediaBuffer = null;
        
        if (quoted.imageMessage) {
            mediaBuffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {},
                { logger: console }
            );
        } else {
            return await sock.sendMessage(sender, {
                text: `❌ Ce message ne contient pas d'image`
            });
        }
        
        if (!mediaBuffer) {
            return await sock.sendMessage(sender, {
                text: `❌ Impossible de télécharger l'image`
            });
        }
        
        await sock.sendMessage(sender, {
            text: `⏳ Changement de photo de profil...`
        });
        
        try {
            const timestamp = Date.now();
            const imagePath = path.join(tempDir, `pp_${timestamp}.jpg`);
            fs.writeFileSync(imagePath, mediaBuffer);
            
            await sock.updateProfilePicture(sender, fs.readFileSync(imagePath));
            
            fs.unlinkSync(imagePath);
            
            await sock.sendMessage(sender, {
                text: `╭━━━ *PHOTO DE PROFIL* ━━━
┃
┃ ✅ *Photo mise à jour !*
┃
┃ 👤 *Utilisateur:* ${participant.split('@')[0]}
┃
┃ 💫 *Digital Crew 243*
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
            
            console.log(`✓ Photo de profil changée pour ${participant.split('@')[0]}`);
            
        } catch (error) {
            console.error('Setpp error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur: ${error.message || 'Impossible de changer la photo de profil'}`
            });
        }
    }
};
