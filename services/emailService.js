const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.testMode = false;
    this.initializeTransporter();
  }

  /**
   * E-Mail Transporter initialisieren (mit automatischem Test-Modus)
   */
  async initializeTransporter() {
    try {
      // Prüfe ob E-Mail Credentials konfiguriert sind
      const hasRealCredentials = this.hasValidEmailCredentials();
      
      if (!hasRealCredentials) {
        logger.warn('🧪 TEST MODUS AKTIVIERT: Keine gültigen E-Mail Credentials gefunden');
        logger.info('💡 E-Mails werden simuliert und in Logs ausgegeben');
        this.testMode = true;
        this.transporter = this.createMockTransporter();
        return;
      }

      // Versuche echten E-Mail Transporter zu erstellen
      const transporterConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      };

      this.transporter = nodemailer.createTransporter(transporterConfig);

      // Verbindung testen
      await this.transporter.verify();
      this.testMode = false;
      logger.email('Echter E-Mail Transporter initialisiert', {
        host: transporterConfig.host,
        port: transporterConfig.port,
        secure: transporterConfig.secure,
        user: transporterConfig.auth.user
      });

    } catch (error) {
      logger.warn('⚠️  E-Mail Service nicht verfügbar, wechsle zu Test-Modus:', error.message);
      logger.info('🧪 E-Mails werden simuliert und in Logs ausgegeben');
      this.testMode = true;
      this.transporter = this.createMockTransporter();
    }
  }

  /**
   * Prüft ob gültige E-Mail Credentials vorhanden sind
   */
  hasValidEmailCredentials() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    
    // Prüfe auf leere oder Dummy-Werte
    const dummyValues = [
      'your-email@gmail.com',
      'deine-email@gmail.com', 
      'test@example.com',
      'your-app-password',
      'dein-app-passwort',
      'app-passwort',
      'auto-generated'
    ];

    if (!user || !pass) {
      return false;
    }

    if (dummyValues.includes(user.toLowerCase()) || dummyValues.includes(pass.toLowerCase())) {
      return false;
    }

    if (user.length < 5 || pass.length < 8) {
      return false;
    }

    return true;
  }

  /**
   * Mock-Transporter für Tests erstellen
   */
  createMockTransporter() {
    return {
      verify: () => {
        logger.info('🧪 Mock E-Mail Transporter verifiziert');
        return Promise.resolve(true);
      },
      
      sendMail: (options) => {
        const mockId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        
        // Detaillierte Mock E-Mail Information
        const mockEmailInfo = {
          messageId: `${mockId}@test.mitra-sanitaer.de`,
          timestamp: timestamp,
          from: typeof options.from === 'object' ? options.from.address : options.from,
          to: options.to,
          subject: options.subject,
          bodyLength: options.html ? options.html.length : 0,
          attachments: options.attachments ? options.attachments.length : 0,
          replyTo: options.replyTo || null
        };

        // Mock E-Mail Details loggen
        logger.info('📧 MOCK E-MAIL DETAILS:', mockEmailInfo);
        
        if (options.attachments && options.attachments.length > 0) {
          logger.info('📎 MOCK E-MAIL ATTACHMENTS:', 
            options.attachments.map(att => ({
              filename: att.filename,
              contentType: att.contentType,
              hasPath: !!att.path,
              size: att.path ? this.getFileSize(att.path) : 'unknown'
            }))
          );
        }

        // HTML Body Preview (erste 200 Zeichen)
        if (options.html && process.env.PDF_DEBUG_MODE === 'true') {
          const preview = options.html.replace(/<[^>]*>/g, '').substring(0, 200);
          logger.info('📄 MOCK E-MAIL PREVIEW:', preview + '...');
        }

        // Mock Response wie echter SMTP
        return Promise.resolve({
          messageId: mockEmailInfo.messageId,
          response: '250 2.0.0 OK Mock email queued for delivery',
          envelope: {
            from: mockEmailInfo.from,
            to: Array.isArray(options.to) ? options.to : [options.to]
          },
          accepted: Array.isArray(options.to) ? options.to : [options.to],
          rejected: [],
          pending: [],
          mockMode: true,
          timestamp: timestamp
        });
      }
    };
  }

  /**
   * Hilfsfunktion: Dateigröße ermitteln
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return `${(stats.size / 1024).toFixed(2)} KB`;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Sichere Array-Join Funktion
   */
  safeJoin(array, separator = ', ') {
    if (!array || !Array.isArray(array)) {
      return 'Keine ausgewählt';
    }
    const filtered = array.filter(item => item != null && item !== '');
    return filtered.length > 0 ? filtered.join(separator) : 'Keine ausgewählt';
  }

  /**
   * Prüft ob E-Mail Service verfügbar ist
   */
  isAvailable() {
    return this.transporter !== null;
  }

  /**
   * Gibt Informationen über den aktuellen Modus zurück
   */
  getServiceInfo() {
    return {
      available: this.isAvailable(),
      testMode: this.testMode,
      hasCredentials: this.hasValidEmailCredentials(),
      emailHost: process.env.EMAIL_HOST || 'not configured',
      emailUser: process.env.EMAIL_USER || 'not configured'
    };
  }

  /**
   * Normales Kontaktformular senden
   */
  async sendContactForm(formData) {
    try {
      if (!this.isAvailable()) {
        throw new Error('E-Mail Service ist nicht verfügbar');
      }

      const referenceId = `CONTACT-${uuidv4().substr(0, 8)}`;
      const timestamp = moment().format('DD.MM.YYYY HH:mm:ss');

      // E-Mail Inhalt erstellen
      const emailSubject = `Kontaktanfrage: ${formData.subject}`;
      const emailBody = this.generateContactFormEmailBody(formData, referenceId, timestamp);

      // E-Mail senden
      const mailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Mitra Sanitär GmbH',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: process.env.EMAIL_TO,
        subject: emailSubject,
        html: emailBody,
        replyTo: formData.email
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Erfolgs-Logging je nach Modus
      if (this.testMode) {
        logger.email('🧪 Mock Kontaktformular versendet', { 
          referenceId: referenceId,
          to: process.env.EMAIL_TO,
          from: formData.email,
          subject: emailSubject,
          mockMode: true
        });
      } else {
        logger.email('📧 Kontaktformular versendet', {
          messageId: result.messageId,
          referenceId: referenceId,
          to: process.env.EMAIL_TO,
          from: formData.email,
          subject: emailSubject
        });
      }

      return {
        success: true,
        message: this.testMode ? 
          'Mock E-Mail erfolgreich simuliert (Test-Modus)' : 
          'E-Mail erfolgreich versendet',
        referenceId: referenceId,
        recipient: process.env.EMAIL_TO,
        subject: emailSubject,
        testMode: this.testMode
      };

    } catch (error) {
      logger.error('Fehler beim Senden des Kontaktformulars:', error);
      return {
        success: false,
        message: `E-Mail konnte nicht versendet werden: ${error.message}`,
        testMode: this.testMode
      };
    }
  }

  /**
   * Badkonfigurator E-Mail mit PDF senden
   */
  async sendBathroomConfiguration(data) {
    try {
      if (!this.isAvailable()) {
        throw new Error('E-Mail Service ist nicht verfügbar');
      }

      const { contactData, bathroomData, comments, additionalInfo, pdfPath, pdfFilename } = data;
      const referenceId = `BATHROOM-${uuidv4().substr(0, 8)}`;
      const timestamp = moment().format('DD.MM.YYYY HH:mm:ss');

      // E-Mail Inhalt erstellen
      const emailSubject = `Badkonfigurator Anfrage - ${contactData.firstName} ${contactData.lastName}`;
      const emailBody = this.generateBathroomConfigurationEmailBody(
        contactData, 
        bathroomData, 
        comments, 
        additionalInfo, 
        referenceId, 
        timestamp
      );

      // Attachments vorbereiten
      const attachments = [];
      if (pdfPath && await fs.pathExists(pdfPath)) {
        attachments.push({
          filename: pdfFilename || 'Badkonfiguration.pdf',
          path: pdfPath,
          contentType: 'application/pdf'
        });
      }

      // E-Mail senden
      const mailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Mitra Sanitär GmbH',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: process.env.EMAIL_TO,
        subject: emailSubject,
        html: emailBody,
        replyTo: contactData.email,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Erfolgs-Logging je nach Modus
      if (this.testMode) {
        logger.email('🧪 Mock Badkonfigurator E-Mail versendet', {
          referenceId: referenceId,
          to: process.env.EMAIL_TO,
          from: contactData.email,
          subject: emailSubject,
          pdfAttached: attachments.length > 0,
          mockMode: true,
          customer: `${contactData.firstName} ${contactData.lastName}`
        });
      } else {
        logger.email('📧 Badkonfigurator E-Mail versendet', {
          messageId: result.messageId,
          referenceId: referenceId,
          to: process.env.EMAIL_TO,
          from: contactData.email,
          subject: emailSubject,
          pdfAttached: attachments.length > 0,
          customer: `${contactData.firstName} ${contactData.lastName}`
        });
      }

      return {
        success: true,
        message: this.testMode ? 
          'Mock Badkonfiguration erfolgreich simuliert (Test-Modus)' : 
          'Badkonfiguration erfolgreich versendet',
        referenceId: referenceId,
        recipient: process.env.EMAIL_TO,
        subject: emailSubject,
        testMode: this.testMode
      };

    } catch (error) {
      logger.error('Fehler beim Senden der Badkonfiguration:', error);
      return {
        success: false,
        message: `Badkonfiguration konnte nicht versendet werden: ${error.message}`,
        testMode: this.testMode
      };
    }
  }

  /**
   * E-Mail Body für Kontaktformular generieren
   */
  generateContactFormEmailBody(formData, referenceId, timestamp) {
    const serviceLabels = {
      'heating': 'Heizungsbau',
      'bathroom': 'Bäderbau',
      'installation': 'Installation',
      'emergency': 'Notdienst',
      'consultation': 'Beratung'
    };

    const selectedService = serviceLabels[formData.service] || 'Nicht angegeben';
    const urgentText = formData.urgent ? '🔴 DRINGENDE ANFRAGE' : '';
    const testModeHeader = this.testMode ? '<div style="background: #fef3cd; padding: 10px; margin-bottom: 20px; border: 1px solid #f59e0b; border-radius: 5px;"><strong>🧪 TEST MODUS:</strong> Diese E-Mail wurde nur simuliert</div>' : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 20px; padding: 15px; border-left: 4px solid #1e3a8a; background-color: #f8fafc; }
        .urgent { background-color: #fee2e2; border-left-color: #dc2626; }
        .footer { background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
        .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; }
        .info-label { font-weight: bold; }
        .test-mode { background: #fef3cd; padding: 10px; margin-bottom: 20px; border: 1px solid #f59e0b; border-radius: 5px; }
    </style>
</head>
<body>
    ${testModeHeader}
    
    <div class="header">
        <h1>📧 Neue Kontaktanfrage</h1>
        <p>${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'}</p>
        ${urgentText ? `<p style="font-size: 18px; font-weight: bold;">${urgentText}</p>` : ''}
    </div>
    
    <div class="content">
        <div class="section ${formData.urgent ? 'urgent' : ''}">
            <h3>📋 Kontaktdaten</h3>
            <div class="info-grid">
                <span class="info-label">Name:</span>
                <span>${formData.firstName} ${formData.lastName}</span>
                
                <span class="info-label">E-Mail:</span>
                <span><a href="mailto:${formData.email}">${formData.email}</a></span>
                
                ${formData.phone ? `
                <span class="info-label">Telefon:</span>
                <span><a href="tel:${formData.phone}">${formData.phone}</a></span>
                ` : ''}
                
                <span class="info-label">Service:</span>
                <span>${selectedService}</span>
                
                <span class="info-label">Betreff:</span>
                <span>${formData.subject}</span>
            </div>
        </div>
        
        <div class="section">
            <h3>💬 Nachricht</h3>
            <p style="white-space: pre-line;">${formData.message}</p>
        </div>
        
        <div class="section">
            <h3>ℹ️ System-Informationen</h3>
            <div class="info-grid">
                <span class="info-label">Referenz-ID:</span>
                <span>${referenceId}</span>
                
                <span class="info-label">Eingegangen am:</span>
                <span>${timestamp}</span>
                
                <span class="info-label">Dringend:</span>
                <span>${formData.urgent ? 'Ja - Antwort binnen 2 Stunden gewünscht' : 'Nein'}</span>
                
                ${this.testMode ? `
                <span class="info-label">Test-Modus:</span>
                <span style="color: #f59e0b; font-weight: bold;">AKTIV - Keine echte E-Mail</span>
                ` : ''}
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>Diese E-Mail wurde ${this.testMode ? 'simuliert' : 'automatisch'} über das Kontaktformular der ${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'} Website generiert.</p>
        <p>Bitte antworten Sie direkt an: <a href="mailto:${formData.email}">${formData.email}</a></p>
    </div>
</body>
</html>
    `;
  }

  /**
   * E-Mail Body für Badkonfigurator generieren - KOMPLETT GEFIXT
   */
  generateBathroomConfigurationEmailBody(contactData, bathroomData, comments, additionalInfo, referenceId, timestamp) {
    // SICHERE Ausgewählte Ausstattung formatieren
    const selectedEquipment = (bathroomData?.equipment || [])
      .filter(item => item?.selected)
      .map(item => {
        const selectedOption = item?.popupDetails?.options?.find(opt => opt?.selected);
        return selectedOption ? `${item.name}: ${selectedOption.name}` : item.name;
      });

    // SICHERE Zusätzliche Informationen formatieren
    const additionalInfoList = additionalInfo ? Object.entries(additionalInfo)
      .filter(([key, value]) => value)
      .map(([key]) => {
        const labels = {
          'projektablauf': 'Projektablauf',
          'garantie': 'Garantie & Gewährleistung',
          'referenzen': 'Referenzen',
          'foerderung': 'Förderungsmöglichkeiten'
        };
        return labels[key] || key;
      }) : [];

    const testModeHeader = this.testMode ? '<div style="background: #fef3cd; padding: 10px; margin-bottom: 20px; border: 1px solid #f59e0b; border-radius: 5px;"><strong>🧪 TEST MODUS:</strong> Diese E-Mail wurde nur simuliert</div>' : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 20px; padding: 15px; border-left: 4px solid #1e3a8a; background-color: #f8fafc; }
        .footer { background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
        .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; }
        .info-label { font-weight: bold; }
        .equipment-list { margin: 10px 0; }
        .equipment-item { padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
        .test-mode { background: #fef3cd; padding: 10px; margin-bottom: 20px; border: 1px solid #f59e0b; border-radius: 5px; }
    </style>
</head>
<body>
    ${testModeHeader}
    
    <div class="header">
        <h1>🛁 Neue Badkonfigurator Anfrage</h1>
        <p>${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'}</p>
        ${this.testMode ? '<p style="font-size: 14px; opacity: 0.9;">🧪 Test-Modus aktiv</p>' : ''}
    </div>
    
    <div class="content">
        <div class="section">
            <h3>👤 Kontaktdaten</h3>
            <div class="info-grid">
                <span class="info-label">Name:</span>
                <span>${contactData?.salutation || ''} ${contactData?.firstName || ''} ${contactData?.lastName || ''}</span>
                
                <span class="info-label">E-Mail:</span>
                <span><a href="mailto:${contactData?.email || ''}">${contactData?.email || ''}</a></span>
                
                <span class="info-label">Telefon:</span>
                <span><a href="tel:${contactData?.phone || ''}">${contactData?.phone || ''}</a></span>
            </div>
        </div>
        
        <div class="section">
            <h3>🛁 Badkonfiguration</h3>
            <div class="info-grid">
                <span class="info-label">Badgröße:</span>
                <span>${bathroomData?.bathroomSize || 'Nicht angegeben'} m²</span>
                
                <span class="info-label">Qualitätsstufe:</span>
                <span>${bathroomData?.qualityLevel?.name || 'Nicht ausgewählt'}</span>
            </div>
            
            ${selectedEquipment.length > 0 ? `
            <h4>Gewählte Ausstattung:</h4>
            <div class="equipment-list">
                ${selectedEquipment.map(item => `<div class="equipment-item">• ${item}</div>`).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="section">
            <h3>🎨 Fliesen & Heizung</h3>
            <div class="info-grid">
                <span class="info-label">Bodenfliesen:</span>
                <span>${this.safeJoin(bathroomData?.floorTiles)}</span>
                
                <span class="info-label">Wandfliesen:</span>
                <span>${this.safeJoin(bathroomData?.wallTiles)}</span>
                
                <span class="info-label">Heizung:</span>
                <span>${this.safeJoin(bathroomData?.heating)}</span>
            </div>
        </div>
        
        ${additionalInfoList.length > 0 ? `
        <div class="section">
            <h3>📋 Gewünschte Informationen</h3>
            <ul>
                ${additionalInfoList.map(info => `<li>${info}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        ${comments ? `
        <div class="section">
            <h3>💬 Anmerkungen</h3>
            <p style="white-space: pre-line;">${comments}</p>
        </div>
        ` : ''}
        
        <div class="section">
            <h3>ℹ️ System-Informationen</h3>
            <div class="info-grid">
                <span class="info-label">Referenz-ID:</span>
                <span>${referenceId}</span>
                
                <span class="info-label">Eingegangen am:</span>
                <span>${timestamp}</span>
                
                <span class="info-label">System:</span>
                <span>Mitra Sanitär Badkonfigurator v1.0</span>
                
                ${this.testMode ? `
                <span class="info-label">Test-Modus:</span>
                <span style="color: #f59e0b; font-weight: bold;">AKTIV - Keine echte E-Mail</span>
                ` : ''}
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>Diese E-Mail wurde ${this.testMode ? 'simuliert' : 'automatisch'} über den Badkonfigurator der ${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'} Website generiert.</p>
        <p>Bitte antworten Sie direkt an: <a href="mailto:${contactData?.email || ''}">${contactData?.email || ''}</a></p>
        <p>PDF-Konfiguration ${this.testMode ? '(simuliert)' : 'im Anhang'} | ${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'} | ${process.env.COMPANY_ADDRESS || 'Borussiastraße 62a'} | ${process.env.COMPANY_CITY || '12103 Berlin'}</p>
    </div>
</body>
</html>
    `;
  }
}

// Singleton Instance
const emailService = new EmailService();

module.exports = emailService;