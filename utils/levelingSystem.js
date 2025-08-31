const { db } = require('../server/db');
const { users } = require('../server/schema');
const { eq } = require('drizzle-orm');
const logger = require('./logger');

class LevelingSystem {
    constructor() {
        // Define message milestones and corresponding role names
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
    }

    /**
     * Handle a user sending a message
     * @param {Message} message - Discord message object
     */
    async handleMessage(message) {
        // Don't count bot messages
        if (message.author.bot) return;

        try {
            // Get or create user in database
            let user = await this.getUser(message.author.id);
            
            if (!user) {
                user = await this.createUser(message.author.id, message.author.username);
            }

            // Increment message count
            const newMessageCount = user.messageCount + 1;
            await this.updateMessageCount(message.author.id, newMessageCount);

            // Check for milestone achievements
            await this.checkMilestones(message, user.messageCount, newMessageCount);

        } catch (error) {
            console.error('Error handling message for leveling system:', error);
            logger.error(`Leveling system error: ${error.message}`);
        }
    }

    /**
     * Get user from database
     * @param {string} discordId - Discord user ID
     * @returns {Object|null} User object or null
     */
    async getUser(discordId) {
        try {
            const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
            return user || null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    /**
     * Create new user in database
     * @param {string} discordId - Discord user ID
     * @param {string} username - Discord username
     * @returns {Object} Created user object
     */
    async createUser(discordId, username) {
        try {
            const [user] = await db
                .insert(users)
                .values({
                    discordId,
                    username,
                    messageCount: 0
                })
                .returning();
            return user;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user message count
     * @param {string} discordId - Discord user ID
     * @param {number} messageCount - New message count
     */
    async updateMessageCount(discordId, messageCount) {
        try {
            await db
                .update(users)
                .set({ 
                    messageCount,
                    lastMessageAt: new Date()
                })
                .where(eq(users.discordId, discordId));
        } catch (error) {
            console.error('Error updating message count:', error);
            throw error;
        }
    }

    /**
     * Check if user has reached any milestones
     * @param {Message} message - Discord message object
     * @param {number} oldCount - Previous message count
     * @param {number} newCount - New message count
     */
    async checkMilestones(message, oldCount, newCount) {
        const reachedMilestones = this.milestones.filter(milestone => 
            oldCount < milestone.messages && newCount >= milestone.messages
        );

        for (const milestone of reachedMilestones) {
            await this.awardMilestone(message, milestone);
        }
    }

    /**
     * Award milestone role to user
     * @param {Message} message - Discord message object
     * @param {Object} milestone - Milestone object with messages and roleName
     */
    async awardMilestone(message, milestone) {
        try {
            await this.awardMilestoneRole(message.member, milestone, true, message.channel);
        } catch (error) {
            console.error('Error awarding milestone:', error);
            logger.error(`Error awarding milestone: ${error.message}`);
        }
    }

    /**
     * Award milestone role to a member
     * @param {GuildMember} member - Discord guild member
     * @param {Object} milestone - Milestone object with messages and roleName
     * @param {boolean} announce - Whether to announce the milestone
     * @param {Channel} channel - Channel to announce in (optional)
     */
    async awardMilestoneRole(member, milestone, announce = true, channel = null) {
        try {
            const guild = member.guild;

            // Find or create the role
            let role = guild.roles.cache.find(r => r.name === milestone.roleName);
            
            if (!role) {
                role = await guild.roles.create({
                    name: milestone.roleName,
                    color: this.getMilestoneColor(milestone.messages),
                    reason: `Leveling system role for ${milestone.messages} messages`
                });
            }

            // Add role to user
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                
                // Send congratulations message if requested
                if (announce && channel) {
                    const congratsMessage = `🎉 Congratulations ${member.user}! You've reached **${milestone.messages} messages** and earned the **${milestone.roleName}** role!`;
                    await channel.send(congratsMessage);
                }
                
                logger.log(`${member.user.tag} earned ${milestone.roleName} role (${milestone.messages} messages)`, 'LEVELING');
            }

        } catch (error) {
            console.error('Error awarding milestone role:', error);
            logger.error(`Error awarding milestone role: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get color for milestone role based on message count
     * @param {number} messageCount - Number of messages
     * @returns {string} Hex color code
     */
    getMilestoneColor(messageCount) {
        if (messageCount >= 50000) return '#e74c3c';      // Red
        if (messageCount >= 25000) return '#9b59b6';      // Purple
        if (messageCount >= 10000) return '#3498db';      // Blue
        if (messageCount >= 5000) return '#1abc9c';       // Teal
        if (messageCount >= 2500) return '#2ecc71';       // Green
        if (messageCount >= 1000) return '#f39c12';       // Orange
        if (messageCount >= 500) return '#e67e22';        // Dark Orange
        return '#95a5a6';                                  // Gray
    }

    /**
     * Get user's current message count
     * @param {string} discordId - Discord user ID
     * @returns {number} Message count
     */
    async getUserMessageCount(discordId) {
        const user = await this.getUser(discordId);
        return user ? user.messageCount : 0;
    }

    /**
     * Get milestones array
     * @returns {Array} Array of milestone objects
     */
    getMilestones() {
        return this.milestones;
    }
}

module.exports = new LevelingSystem();