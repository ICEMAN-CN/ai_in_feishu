const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};
function getLogLevel() {
    const env = process.env.LOG_LEVEL;
    if (env && env in LOG_LEVELS) {
        return env;
    }
    return 'INFO';
}
const currentLevel = getLogLevel();
function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
function formatTimestamp() {
    return new Date().toISOString();
}
function formatMessage(level, module, message) {
    return `[${level}] [${formatTimestamp()}] [${module}] ${message}`;
}
export const logger = {
    debug(module, message, ...args) {
        if (shouldLog('DEBUG')) {
            console.log(formatMessage('DEBUG', module, message), ...args);
        }
    },
    info(module, message, ...args) {
        if (shouldLog('INFO')) {
            console.log(formatMessage('INFO', module, message), ...args);
        }
    },
    warn(module, message, ...args) {
        if (shouldLog('WARN')) {
            console.warn(formatMessage('WARN', module, message), ...args);
        }
    },
    error(module, message, ...args) {
        if (shouldLog('ERROR')) {
            console.error(formatMessage('ERROR', module, message), ...args);
        }
    },
};
//# sourceMappingURL=logger.js.map