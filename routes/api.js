const express = require('express');
const router = express.Router();

const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const validation = require('../middleware/validation');

// Middleware für JSON Response Headers
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * POST /api/contact
 * Normales Kontaktformular
 */
router.post('/contact', validation.validateContactForm, async (req, res) => {
  try {
    logger.api('/contact', 'POST', { 
      firstName: req.body.firstName, 
      lastName: req.body.lastName,
      service: req.body.service 
    });

    const result = await emailService.sendContactForm(req.body);
    
    if (result.success) {
      logger.email('Kontaktformular gesendet', { 
        to: result.recipient,
        subject: result.subject
      });
      
      res.status(200).json({
        success: true,
        message: 'Ihre Nachricht wurde erfolgreich versendet. Wir melden uns schnellstmöglich bei Ihnen zurück.',
        timestamp: new Date().toISOString(),
        referenceId: result.referenceId
      });
    } else {
      throw new Error(result.message);
    }

  } catch (error) {
    logger.error('Fehler beim Senden des Kontaktformulars:', error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/send-bathroom-configuration
 * Badkonfigurator E-Mail mit PDF
 */
router.post('/send-bathroom-configuration', validation.validateBathroomConfiguration, async (req, res) => {
  try {
    const { contactData, bathroomData, comments, additionalInfo } = req.body;
    
    logger.api('/send-bathroom-configuration', 'POST', { 
      customer: `${contactData.firstName} ${contactData.lastName}`,
      bathroomSize: bathroomData.bathroomSize,
      equipmentCount: bathroomData.equipment?.filter(e => e.selected)?.length || 0
    });

    // PDF generieren
    logger.pdf('Generierung gestartet', { 
      customer: `${contactData.firstName} ${contactData.lastName}`
    });
    
    const pdfResult = await pdfService.generateBathroomConfigurationPDF({
      contactData,
      bathroomData,
      comments,
      additionalInfo
    });

    if (!pdfResult.success) {
      throw new Error(`PDF Generierung fehlgeschlagen: ${pdfResult.message}`);
    }

    // E-Mail mit PDF senden
    const emailResult = await emailService.sendBathroomConfiguration({
      contactData,
      bathroomData,
      comments,
      additionalInfo,
      pdfPath: pdfResult.filePath,
      pdfFilename: pdfResult.filename
    });

    if (emailResult.success) {
      logger.email('Badkonfigurator E-Mail gesendet', { 
        to: emailResult.recipient,
        customer: `${contactData.firstName} ${contactData.lastName}`,
        pdfAttached: !!pdfResult.filePath
      });

      res.status(200).json({
        success: true,
        message: 'Ihre Badkonfiguration wurde erfolgreich versendet. Wir erstellen Ihnen gerne ein individuelles Angebot.',
        timestamp: new Date().toISOString(),
        referenceId: emailResult.referenceId,
        pdfGenerated: true,
        emailSent: true,
        debug: process.env.PDF_DEBUG_MODE === 'true' ? {
          filename: pdfResult.filename,
          downloadUrl: pdfResult.downloadUrl,
          pdfSize: pdfResult.size,
          pdfSaved: pdfResult.saved
        } : undefined
      });
    } else {
      throw new Error(emailResult.message);
    }

  } catch (error) {
    logger.error('Fehler beim Senden der Badkonfiguration:', error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten Ihrer Badkonfiguration. Bitte versuchen Sie es erneut.',
      timestamp: new Date().toISOString(),
      pdfGenerated: false,
      emailSent: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/generate-pdf-only
 * PDF Test ohne E-Mail
 */
router.post('/generate-pdf-only', validation.validateBathroomConfiguration, async (req, res) => {
  try {
    const { contactData, bathroomData, comments, additionalInfo } = req.body;
    
    logger.api('/generate-pdf-only', 'POST', { 
      customer: `${contactData.firstName} ${contactData.lastName}`
    });

    const result = await pdfService.generateBathroomConfigurationPDF({
      contactData,
      bathroomData,
      comments,
      additionalInfo
    });

    if (result.success) {
      logger.pdf('Test PDF erfolgreich generiert', { 
        filename: result.filename,
        size: result.size
      });

      res.status(200).json({
        success: true,
        message: 'PDF wurde erfolgreich generiert',
        timestamp: new Date().toISOString(),
        debug: {
          filename: result.filename,
          downloadUrl: result.downloadUrl,
          pdfSize: result.size,
          pdfSaved: result.saved,
          outputPath: process.env.NODE_ENV === 'development' ? result.filePath : undefined
        }
      });
    } else {
      throw new Error(result.message);
    }

  } catch (error) {
    logger.error('Fehler bei PDF-Test:', error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des Test-PDFs',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/debug-pdfs
 * Debug: Alle generierten PDFs auflisten
 */
router.get('/debug-pdfs', async (req, res) => {
  try {
    if (process.env.PDF_DEBUG_MODE !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Debug Modus ist nicht aktiviert',
        debugMode: false
      });
    }

    logger.api('/debug-pdfs', 'GET');

    const result = await pdfService.listDebugPDFs();
    
    res.status(200).json({
      success: true,
      debugMode: true,
      count: result.pdfs.length,
      pdfs: result.pdfs,
      totalSize: result.totalSize,
      outputDirectory: result.outputDirectory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Fehler beim Auflisten der Debug-PDFs:', error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Auflisten der Debug-PDFs',
      debugMode: process.env.PDF_DEBUG_MODE === 'true',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/debug-pdfs
 * Debug: Alle PDFs löschen
 */
router.delete('/debug-pdfs', async (req, res) => {
  try {
    if (process.env.PDF_DEBUG_MODE !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Debug Modus ist nicht aktiviert'
      });
    }

    logger.api('/debug-pdfs', 'DELETE');

    const result = await pdfService.clearDebugPDFs();
    
    logger.pdf('Debug PDFs gelöscht', { count: result.deletedCount });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} Debug-PDFs wurden gelöscht`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Fehler beim Löschen der Debug-PDFs:', error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Debug-PDFs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;