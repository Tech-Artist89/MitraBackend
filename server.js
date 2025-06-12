const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const logger = require('./utils/logger');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS Configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:4200',
    'http://localhost:4200',
    'http://127.0.0.1:4200'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // 10 requests per window
  message: {
    error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    resetTime: new Date(Date.now() + (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000))
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
  next();
});

// Create directories if they don't exist
const createDirectories = async () => {
  try {
    const pdfDir = process.env.PDF_OUTPUT_DIR || './generated-pdfs';
    await fs.ensureDir(pdfDir);
    logger.info(`📁 PDF Output Directory erstellt/überprüft: ${pdfDir}`);
  } catch (error) {
    logger.error('Fehler beim Erstellen der Verzeichnisse:', error);
  }
};

// API Routes
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Mitra Sanitär Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      contact: '/api/contact',
      bathroomConfiguration: '/api/send-bathroom-configuration',
      pdfTest: '/api/generate-pdf-only',
      debugPdfs: '/api/debug-pdfs'
    }
  };
  
  logger.info('Health check aufgerufen');
  res.status(200).json(healthCheck);
});

// Static Files (for generated PDFs in debug mode)
if (process.env.PDF_DEBUG_MODE === 'true') {
  const pdfDir = process.env.PDF_OUTPUT_DIR || './generated-pdfs';
  app.use('/debug/pdfs', express.static(pdfDir));
  logger.info('📄 Debug PDF Route aktiviert: /debug/pdfs');
}

// Error Handler
app.use((error, req, res, next) => {
  logger.error('Unbehandelter Fehler:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Ein interner Serverfehler ist aufgetreten.' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route nicht gefunden: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route nicht gefunden',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM Signal empfangen. Server wird heruntergefahren...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT Signal empfangen. Server wird heruntergefahren...');
  process.exit(0);
});

// Unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unbehandelte Promise Rejection:', { reason, promise });
});

// Uncaught Exceptions
process.on('uncaughtException', (error) => {
  logger.error('Unbehandelte Exception:', error);
  process.exit(1);
});

// Start Server
const startServer = async () => {
  try {
    await createDirectories();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Mitra Sanitär Backend läuft auf Port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📧 E-Mail Ziel: ${process.env.EMAIL_TO}`);
      logger.info(`🔗 CORS aktiviert für: ${corsOptions.origin.join(', ')}`);
      logger.info(`📄 PDF Debug Modus: ${process.env.PDF_DEBUG_MODE === 'true' ? 'AN' : 'AUS'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`\n🔗 Verfügbare Endpunkte:`);
        logger.info(`   Health Check: http://localhost:${PORT}/api/health`);
        logger.info(`   Kontaktformular: http://localhost:${PORT}/api/contact`);
        logger.info(`   Badkonfigurator: http://localhost:${PORT}/api/send-bathroom-configuration`);
        logger.info(`   PDF Test: http://localhost:${PORT}/api/generate-pdf-only`);
        logger.info(`   Debug PDFs: http://localhost:${PORT}/api/debug-pdfs`);
        if (process.env.PDF_DEBUG_MODE === 'true') {
          logger.info(`   PDF Downloads: http://localhost:${PORT}/debug/pdfs/`);
        }
      }
    });
  } catch (error) {
    logger.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
};

startServer();