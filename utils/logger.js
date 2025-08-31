const fs = require('fs');
const path = require('path');

/**
 * Simple logging utility for the Discord bot
 * Logs actions to both console and file
 */

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }
    
    /**
     * Ensure the logs directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    /**
     * Get current date string for log file naming
     * @returns {string} - Date string in YYYY-MM-DD format
     */
    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
    
    /**
     * Get current timestamp string
     * @returns {string} - Timestamp string
     */
    getTimestamp() {
        return new Date().toISOString();
    }
    
    /**
     * Log a message with specified level
     * @param {string} message - Message to log
     * @param {string} level - Log level (INFO, WARN, ERROR, MODERATION, etc.)
     */
    log(message, level = 'INFO') {
        const timestamp = this.getTimestamp();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Log to console with color coding
        this.logToConsole(logMessage, level);
        
        // Log to file
        this.logToFile(logMessage, level);
    }
    
    /**
     * Log to console with color coding
     * @param {string} message - Formatted log message
     * @param {string} level - Log level
     */
    logToConsole(message, level) {
        const colors = {
            INFO: '\x1b[36m',      // Cyan
            WARN: '\x1b[33m',      // Yellow
            ERROR: '\x1b[31m',     // Red
            MODERATION: '\x1b[35m', // Magenta
            ANONYMOUS_MESSAGE: '\x1b[32m', // Green
            RESET: '\x1b[0m'       // Reset
        };
        
        const color = colors[level] || colors.INFO;
        console.log(`${color}${message}${colors.RESET}`);
    }
    
    /**
     * Log to file
     * @param {string} message - Formatted log message
     * @param {string} level - Log level
     */
    logToFile(message, level) {
        try {
            let filename;
            
            // Different log files for different types of logs
            switch (level) {
                case 'MODERATION':
                    filename = `moderation-${this.getDateString()}.log`;
                    break;
                case 'ERROR':
                    filename = `error-${this.getDateString()}.log`;
                    break;
                case 'ANONYMOUS_MESSAGE':
                    filename = `anonymous-${this.getDateString()}.log`;
                    break;
                default:
                    filename = `general-${this.getDateString()}.log`;
            }
            
            const logPath = path.join(this.logDir, filename);
            fs.appendFileSync(logPath, message + '\n', 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    /**
     * Log info message
     * @param {string} message - Message to log
     */
    info(message) {
        this.log(message, 'INFO');
    }
    
    /**
     * Log warning message
     * @param {string} message - Message to log
     */
    warn(message) {
        this.log(message, 'WARN');
    }
    
    /**
     * Log error message
     * @param {string} message - Message to log
     */
    error(message) {
        this.log(message, 'ERROR');
    }
    
    /**
     * Log moderation action
     * @param {string} message - Message to log
     */
    moderation(message) {
        this.log(message, 'MODERATION');
    }
    
    /**
     * Log anonymous message action
     * @param {string} message - Message to log
     */
    anonymousMessage(message) {
        this.log(message, 'ANONYMOUS_MESSAGE');
    }
    
    /**
     * Clean old log files (older than specified days)
     * @param {number} daysToKeep - Number of days to keep logs
     */
    cleanOldLogs(daysToKeep = 30) {
        try {
            const files = fs.readdirSync(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    this.log(`Deleted old log file: ${file}`, 'INFO');
                }
            });
        } catch (error) {
            this.error(`Failed to clean old logs: ${error.message}`);
        }
    }
}

module.exports = new Logger();
