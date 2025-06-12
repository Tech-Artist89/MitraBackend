const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

// Erstelle logs Verzeichnis falls es nicht existiert
const logsDir = path.join(__dirname, '../logs');
fs.ensureDirSync(logsDir);

// Custom Format für bessere Lesbarkeit
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Zusätzliche Metadaten hinzufügen
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Logger Konfiguration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'mitra-sanitaer-backend' },
  transports: [
    // Konsolen-Output (nur in Development)
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    
    // Error Log File
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Combined Log File
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Exception Handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ],
  
  // Rejection Handling
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Produktions-spezifische Anpassungen
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'production.log'),
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 20,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

// Helper Funktionen für bessere Log-Nachrichten
logger.email = (action, details) => {
  logger.info(`📧 Email ${action}`, {
    category: 'email',
    action,
    ...details
  });
};

logger.pdf = (action, details) => {
  logger.info(`📄 PDF ${action}`, {
    category: 'pdf',
    action,
    ...details
  });
};

logger.api = (endpoint, method, details) => {
  logger.info(`🔗 API ${method} ${endpoint}`, {
    category: 'api',
    endpoint,
    method,
    ...details
  });
};

logger.security = (event, details) => {
  logger.warn(`🔒 Security Event: ${event}`, {
    category: 'security',
    event,
    ...details
  });
};

// Startup Log
logger.info('🚀 Logger initialisiert', {
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  logsDirectory: logsDir
});

module.exports = logger;