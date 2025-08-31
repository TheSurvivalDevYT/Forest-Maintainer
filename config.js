require('dotenv').config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    CLIENT_ID: process.env.CLIENT_ID || '',
    GUILD_ID: process.env.GUILD_ID || '',
    AUTHORIZED_USER: process.env.AUTHORIZED_USER || 'elijah.cc', // Default authorized user
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || null,
    
    // Permission levels
    PERMISSION_LEVELS: {
        OWNER: 3,
        ADMIN: 2,
        MODERATOR: 1,
        USER: 0
    },
    
    // Default mute role name
    MUTE_ROLE_NAME: 'Muted',
    
    // Temporary ban duration options (in milliseconds)
    TEMPBAN_DURATIONS: {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '3d': 3 * 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
    }
};
