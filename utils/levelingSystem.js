const { db } = require('../server/db');
const { users } = require('../server/schema');
const { eq, desc } = require('drizzle-orm');

class LevelingSystem {
    constructor() {
        this.milestones = [
            { messages: 10, roleName: 'Newbie Deer 10+ Messages' },
            { messages: 100, roleName: 'Newborn Deer 100+ Messages' },
            { messages: 500, roleName: 'New Deer 500+ Messages' },
            { messages: 1000, roleName: 'Deer Enthuaist 1000+ Messages' },
            { messages: 2500, roleName: 'Active Deer 2500+ Messages' },
            { messages: 5000, roleName: 'Deerzilla 5000+ Messages' },
            { messages: 10000, roleName: 'Dapatron 10K+ Messages' },
            { messages: 25000, roleName: 'Holy Deer 25K+ Messages' },
            { messages: 50000, roleName: 'Deer God 50K+ Messages' }
        ];

        // Optional: a temporary in-memory cache to avoid race conditions
        this.awardedRolesCache = new Set();
    }

    async handleMessage(message) {
        if (message.author.bot) return;

        let user = await this.getUser(message.author.id);
        if (!user) {
            user = await this.createUser(message.author.id, message.author.username);
        }

        const newCount = user.messageCount + 1;
        await this.updateMessageCount(message.author.id, newCount);

        await this.checkMilestones(message, user.messageCount, newCount);
    }

    async checkMilestones(message, oldCount, newCount) {
        const reached = this.milestones.filter(m => oldCount < m.messages && newCount >= m.messages);

        for (const milestone of reached) {
            await this.awardMilestoneRole(message.member, milestone, message.channel);
        }
    }

    async awardMilestoneRole(member, milestone, channel = null) {
        if (!member) return;

        try {
            // Use a unique key for caching to prevent double-sends
            const cacheKey = `${member.id}-${milestone.roleName}`;
            if (this.awardedRolesCache.has(cacheKey)) return;

            let role = member.guild.roles.cache.find(r => r.name === milestone.roleName);
            if (!role) {
                role = await member.guild.roles.create({
                    name: milestone.roleName,
                    color: this.getMilestoneColor(milestone.messages),
                    reason: `Leveling milestone role for ${milestone.messages} messages`
                });
            }

            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                this.awardedRolesCache.add(cacheKey);

                if (channel) {
                    channel.send(`🎉 Congratulations ${member.user}! You've reached **${milestone.messages} messages** and earned the **${milestone.roleName}** role!`);
                }

                // Optional: clear cache entry after a few seconds to prevent memory buildup
                setTimeout(() => this.awardedRolesCache.delete(cacheKey), 5000);
            }
        } catch (error) {
            console.error('Error awarding milestone role:', error);
        }
    }

    getMilestoneColor(messages) {
        if (messages >= 50000) return '#e74c3c';
        if (messages >= 25000) return '#9b59b6';
        if (messages >= 10000) return '#3498db';
        if (messages >= 5000) return '#1abc9c';
        if (messages >= 2500) return '#2ecc71';
        if (messages >= 1000) return '#f39c12';
        if (messages >= 500) return '#e67e22';
        return '#95a5a6';
    }

    async getUser(discordId) {
        const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
        return user || null;
    }

    async createUser(discordId, username) {
        const [user] = await db.insert(users).values({ discordId, username, messageCount: 0 }).returning();
        return user;
    }

    async updateMessageCount(discordId, messageCount) {
        await db.update(users).set({ messageCount, lastMessageAt: new Date() }).where(eq(users.discordId, discordId));
    }

    async getUserMessageCount(discordId) {
        const user = await this.getUser(discordId);
        return user ? user.messageCount : 0;
    }

    async getTopUsers(limit = 10) {
        return await db.select().from(users).orderBy(desc(users.messageCount)).limit(limit);
    }

    getMilestones() {
        return this.milestones;
    }
}

module.exports = new LevelingSystem();