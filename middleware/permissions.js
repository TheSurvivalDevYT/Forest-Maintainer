const config = require('../config');

/**
 * Permission system for the Discord bot
 * Restricts certain commands to authorized users
 */

/**
 * Check if a user has the required permission level
 * @param {User} user - Discord user object
 * @param {string} requiredLevel - Required permission level (USER, MODERATOR, ADMIN, OWNER)
 * @returns {boolean} - Whether the user has permission
 */
function checkPermissions(user, requiredLevel = 'USER') {
    const userLevel = getUserPermissionLevel(user);
    const requiredLevelValue = config.PERMISSION_LEVELS[requiredLevel] || 0;
    
    return userLevel >= requiredLevelValue;
}

/**
 * Get the permission level of a user
 * @param {User} user - Discord user object
 * @returns {number} - Permission level value
 */
function getUserPermissionLevel(user) {
    // Check if user is the authorized user (@elijah.cc)
    if (user.username === config.AUTHORIZED_USER || user.tag === config.AUTHORIZED_USER) {
        return config.PERMISSION_LEVELS.OWNER;
    }
    
    // For now, only the authorized user has elevated permissions
    // This can be expanded to check roles, user IDs, etc.
    return config.PERMISSION_LEVELS.USER;
}

/**
 * Get user permission level name
 * @param {User} user - Discord user object
 * @returns {string} - Permission level name
 */
function getUserPermissionLevelName(user) {
    const level = getUserPermissionLevel(user);
    
    for (const [name, value] of Object.entries(config.PERMISSION_LEVELS)) {
        if (value === level) {
            return name;
        }
    }
    
    return 'USER';
}

/**
 * Check if user is authorized (has MODERATOR level or higher)
 * @param {User} user - Discord user object
 * @returns {boolean} - Whether the user is authorized
 */
function isAuthorized(user) {
    return checkPermissions(user, 'MODERATOR');
}

/**
 * Check if user is admin level or higher
 * @param {User} user - Discord user object
 * @returns {boolean} - Whether the user is admin
 */
function isAdmin(user) {
    return checkPermissions(user, 'ADMIN');
}

/**
 * Check if user is the owner
 * @param {User} user - Discord user object
 * @returns {boolean} - Whether the user is the owner
 */
function isOwner(user) {
    return checkPermissions(user, 'OWNER');
}

/**
 * Middleware to check permissions in interaction handlers
 * @param {string} requiredLevel - Required permission level
 * @returns {Function} - Middleware function
 */
function requirePermission(requiredLevel) {
    return (interaction) => {
        if (!checkPermissions(interaction.user, requiredLevel)) {
            return interaction.reply({
                content: `❌ You need ${requiredLevel} permissions to use this command.`,
                ephemeral: true
            });
        }
        return true;
    };
}

module.exports = {
    checkPermissions,
    getUserPermissionLevel,
    getUserPermissionLevelName,
    isAuthorized,
    isAdmin,
    isOwner,
    requirePermission
};
