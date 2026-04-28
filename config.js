import fs from 'fs';

class ConfigManager {
    constructor() {
        this.configPath = './config.json';
        this.premiumPath = './premium.json';
        this.load();
    }

    load() {
        if (!fs.existsSync(this.configPath)) {
            this.config = {
                ownerNumber: '243971724264',
                ownerJid: '243971724264@s.whatsapp.net',
                botName: 'cephalophe',
                prefix: '!',
                sessionDir: 'sessionData',
                mode: 'public',
                antiSpam: true,
                cooldown: 3,
                timezone: 'Africa/Kinshasa',
                mongodbUri: '',
                logLevel: 'info',
                statusForward: true
            };
            this.save();
        } else {
            this.config = JSON.parse(fs.readFileSync(this.configPath));
            if (this.config.statusForward === undefined) {
                this.config.statusForward = true;
                this.save();
            }
        }

        if (!fs.existsSync(this.premiumPath)) {
            this.premium = {
                users: {},
                features: {
                    pairCommand: true,
                    antiDelete: true,
                    downloadLimit: 100
                }
            };
            this.savePremium();
        } else {
            this.premium = JSON.parse(fs.readFileSync(this.premiumPath));
        }
    }

    save() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    savePremium() {
        fs.writeFileSync(this.premiumPath, JSON.stringify(this.premium, null, 2));
    }

    isOwner(jid, botJid) {
        if (!jid) return false;
        const cleanJid = jid.replace(/[^0-9]/g, '');
        const cleanBotJid = botJid ? botJid.replace(/[^0-9]/g, '') : '';
        const owner = this.config.ownerNumber.replace(/[^0-9]/g, '');
        return cleanJid === owner || cleanJid === cleanBotJid || cleanJid.includes(owner);
    }

    isPremium(userJid) {
        return this.premium.users[userJid] || false;
    }

    addPremium(userJid, duration = 30) {
        const expiry = Date.now() + (duration * 24 * 60 * 60 * 1000);
        this.premium.users[userJid] = {
            active: true,
            expiry: expiry,
            addedAt: Date.now()
        };
        this.savePremium();
    }

    removePremium(userJid) {
        delete this.premium.users[userJid];
        this.savePremium();
    }

    checkPremiumExpiry() {
        const now = Date.now();
        for (const [jid, data] of Object.entries(this.premium.users)) {
            if (data.expiry && data.expiry < now) {
                delete this.premium.users[jid];
            }
        }
        this.savePremium();
    }

    setMode(mode) {
        if (mode === 'public' || mode === 'private') {
            this.config.mode = mode;
            this.save();
            return true;
        }
        return false;
    }

    setPrefix(prefix) {
        this.config.prefix = prefix;
        this.save();
    }

    setStatusForward(enabled) {
        this.config.statusForward = enabled;
        this.save();
    }

    isStatusForwardEnabled() {
        return this.config.statusForward === true;
    }

    getSettings(groupJid) {
        if (!this.config.groups) this.config.groups = {};
        if (!this.config.groups[groupJid]) {
            this.config.groups[groupJid] = {
                welcome: false,
                goodbye: false,
                antiLink: false,
                antiBot: false,
                antiSpam: true,
                nsfw: false,
                mute: false
            };
            this.save();
        }
        return this.config.groups[groupJid];
    }

    updateGroupSetting(groupJid, setting, value) {
        if (!this.config.groups) this.config.groups = {};
        if (!this.config.groups[groupJid]) this.getSettings(groupJid);
        this.config.groups[groupJid][setting] = value;
        this.save();
    }
}

export default new ConfigManager();
