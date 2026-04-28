import axios from 'axios';
import WebSocket from 'ws';
import config from '../config.js';

export default {
    name: 'ai',
    description: 'Pose une question à l\'IA (Copilot)',
    adminOnly: false,
    category: 'general',
    execute: async (sock, msg, args, sender, isGroup, participant, commands) => {
        const prefix = config.config.prefix;
        
        if (args.length === 0) {
            return await sock.sendMessage(sender, {
                text: `╭━━━ *IA COPILOT* ━━━
┃
┃ 🤖 Pose une question à l'IA
┃
┃ 📖 *Utilisation:*
┃ ${prefix}ai [question]
┃
┃ 📝 *Exemples:*
┃ ${prefix}ai Qu'est-ce que la programmation?
┃ ${prefix}ai Comment créer un bot WhatsApp?
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`
            });
        }
        
        const question = args.join(' ');
        
        await sock.sendMessage(sender, {
            text: `🤖 *IA COPILOT*\n\n📝 "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"\n\n⚡ Analyse de la requête...`
        });
        
        try {
            const startTime = Date.now();
            
            const headers = {
                'origin': 'https://copilot.microsoft.com',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            };

            const { data } = await axios.post('https://copilot.microsoft.com/c/api/conversations', null, {
                headers,
                timeout: 10000
            });

            const conversationId = data.id;
            const ws = new WebSocket(
                `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`,
                { headers }
            );

            let responseText = '';
            let citations = [];
            let timeoutId = setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 60000);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    event: 'setOptions',
                    supportedFeatures: ['partial-generated-images'],
                    supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe'],
                    ads: { supportedTypes: ['text', 'product', 'multimedia', 'tourActivity', 'propertyPromotion'] }
                }));

                ws.send(JSON.stringify({
                    event: 'send',
                    mode: 'chat',
                    conversationId,
                    content: [{ type: 'text', text: question }],
                    context: {}
                }));
            });

            ws.on('message', (chunk) => {
                try {
                    const parsed = JSON.parse(chunk.toString());

                    switch (parsed.event) {
                        case 'appendText':
                            responseText += parsed.text || '';
                            break;
                        case 'citation':
                            citations.push({
                                title: parsed.title,
                                icon: parsed.iconUrl,
                                url: parsed.url
                            });
                            break;
                        case 'done':
                            clearTimeout(timeoutId);
                            const responseTime = ((Date.now() - startTime) / 1000).toFixed(1);
                            
                            let finalText = `╭━━━ *IA COPILOT* ━━━
┃
┃ 🤖 *Question:* 
┃ ${question}
┃
┃ ✨ *Réponse:* 
┃ ${responseText.substring(0, 3800)}
┃
┃ ⚡ *Temps:* ${responseTime}s
┃
╰━━━━━━━━━━━━━━━
> ${config.config.botName}`;
                            
                            if (citations.length > 0) {
                                finalText += `\n\n📚 *Sources:*\n`;
                                citations.slice(0, 3).forEach((cit, i) => {
                                    finalText += `${i+1}. ${cit.title.substring(0, 50)}\n`;
                                });
                            }
                            
                            sock.sendMessage(sender, { text: finalText });
                            ws.close();
                            break;
                        case 'error':
                            clearTimeout(timeoutId);
                            sock.sendMessage(sender, {
                                text: `❌ Erreur: ${parsed.message || 'L\'IA n\'a pas pu répondre'}`
                            });
                            ws.close();
                            break;
                    }
                } catch (err) {
                    console.error('WebSocket message error:', err);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timeoutId);
                console.error('WebSocket error:', err);
                sock.sendMessage(sender, {
                    text: `❌ Erreur de connexion à l'IA\n\nRéessaie plus tard.`
                });
            });

        } catch (error) {
            console.error('AI error:', error);
            await sock.sendMessage(sender, {
                text: `❌ Erreur: ${error.message || 'Impossible de contacter l\'IA'}\n\nRéessaie plus tard.`
            });
        }
    }
};
