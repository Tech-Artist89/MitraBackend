const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.outputDir = process.env.PDF_OUTPUT_DIR || './generated-pdfs';
    this.ensureOutputDirectory();
  }

  /**
   * Output-Verzeichnis erstellen
   */
  async ensureOutputDirectory() {
    try {
      await fs.ensureDir(this.outputDir);
      logger.pdf('Output-Verzeichnis erstellt/überprüft', { path: this.outputDir });
    } catch (error) {
      logger.error('Fehler beim Erstellen des PDF Output-Verzeichnisses:', error);
    }
  }

  /**
   * Badkonfigurator PDF generieren
   */
  async generateBathroomConfigurationPDF(data) {
    let browser = null;
    
    try {
      const { contactData, bathroomData, comments, additionalInfo } = data;
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
      const filename = `Badkonfigurator_${contactData.lastName}_${timestamp}.pdf`;
      const filePath = path.join(this.outputDir, filename);

      logger.pdf('PDF Generierung gestartet', { 
        customer: `${contactData.firstName} ${contactData.lastName}`,
        filename: filename 
      });

      // Browser starten
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // HTML Content generieren
      const htmlContent = this.generateBathroomConfigurationHTML(contactData, bathroomData, comments, additionalInfo);
      
      // HTML in Page laden
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // PDF generieren
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            <span style="float: left;">Mitra Sanitär GmbH - Badkonfigurator</span>
            <span style="float: right;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 5px;">
            <span>Erstellt am ${moment().format('DD.MM.YYYY HH:mm:ss')} | ${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'} | ${process.env.COMPANY_PHONE || '030 76008921'} | ${process.env.COMPANY_EMAIL || 'hey@mitra-sanitaer.de'}</span>
          </div>
        `
      });

      // PDF speichern
      await fs.writeFile(filePath, pdfBuffer);

      // File Stats
      const stats = await fs.stat(filePath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);

      logger.pdf('PDF erfolgreich generiert', {
        filename: filename,
        size: `${fileSizeKB} KB`,
        path: filePath
      });

      return {
        success: true,
        message: 'PDF erfolgreich generiert',
        filename: filename,
        filePath: filePath,
        size: `${fileSizeKB} KB`,
        saved: true,
        downloadUrl: process.env.PDF_DEBUG_MODE === 'true' ? 
          `http://localhost:${process.env.PORT || 3000}/debug/pdfs/${filename}` : null
      };

    } catch (error) {
      logger.error('Fehler bei PDF-Generierung:', error);
      return {
        success: false,
        message: `PDF konnte nicht generiert werden: ${error.message}`,
        filename: null,
        filePath: null,
        saved: false
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * HTML Content für Badkonfigurator PDF generieren
   */
  generateBathroomConfigurationHTML(contactData, bathroomData, comments, additionalInfo) {
    // Ausgewählte Ausstattung formatieren
    const selectedEquipment = bathroomData.equipment
      .filter(item => item.selected)
      .map(item => {
        const selectedOption = item.popupDetails?.options?.find(opt => opt.selected);
        return {
          name: item.name,
          option: selectedOption ? selectedOption.name : 'Standard',
          description: selectedOption ? selectedOption.description : ''
        };
      });

    // Zusätzliche Informationen formatieren
    const additionalInfoList = Object.entries(additionalInfo)
      .filter(([key, value]) => value)
      .map(([key]) => {
        const labels = {
          'projektablauf': 'Projektablauf',
          'garantie': 'Garantie & Gewährleistung',
          'referenzen': 'Referenzen',
          'foerderung': 'Förderungsmöglichkeiten'
        };
        return labels[key] || key;
      });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Badkonfigurator - ${contactData.firstName} ${contactData.lastName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .section-title {
            color: #1e3a8a;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
        }
        
        .section-icon {
            margin-right: 10px;
            font-size: 24px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .info-label {
            font-weight: 600;
            color: #4a5568;
        }
        
        .info-value {
            color: #2d3748;
        }
        
        .equipment-list {
            margin-top: 15px;
        }
        
        .equipment-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .equipment-name {
            font-weight: 600;
            color: #2d3748;
        }
        
        .equipment-option {
            color: #4a5568;
            font-size: 14px;
        }
        
        .tiles-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .tile-category {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .tile-category h4 {
            color: #1e3a8a;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .tile-list {
            color: #4a5568;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .comments-section {
            background: white;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            margin-top: 15px;
        }
        
        .additional-info-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .info-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .footer {
            background: #f1f5f9;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin-top: 30px;
            border: 1px solid #e2e8f0;
        }
        
        .footer-info {
            color: #64748b;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .company-logo {
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-logo">${process.env.COMPANY_NAME || 'MITRA SANITÄR GMBH'}</div>
            <h1>🛁 Ihr Badkonfigurator</h1>
            <div class="subtitle">Individuelle Badplanung - Erstellt am ${moment().format('DD.MM.YYYY HH:mm:ss')}</div>
        </div>

        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">👤</span>
                Kontaktdaten
            </h2>
            <div class="info-grid">
                <div class="info-label">Name:</div>
                <div class="info-value">${contactData.salutation} ${contactData.firstName} ${contactData.lastName}</div>
                
                <div class="info-label">E-Mail:</div>
                <div class="info-value">${contactData.email}</div>
                
                <div class="info-label">Telefon:</div>
                <div class="info-value">${contactData.phone}</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">🛁</span>
                Badkonfiguration
            </h2>
            <div class="info-grid">
                <div class="info-label">Badezimmergröße:</div>
                <div class="info-value">${bathroomData.bathroomSize} m²</div>
                
                <div class="info-label">Qualitätsstufe:</div>
                <div class="info-value">${bathroomData.qualityLevel?.name || 'Nicht ausgewählt'}</div>
            </div>
            
            ${bathroomData.qualityLevel?.description ? `
            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                <strong>Qualitätsbeschreibung:</strong><br>
                ${bathroomData.qualityLevel.description}
            </div>
            ` : ''}

            ${selectedEquipment.length > 0 ? `
            <h3 style="margin-top: 25px; margin-bottom: 15px; color: #1e3a8a;">Gewählte Ausstattung:</h3>
            <div class="equipment-list">
                ${selectedEquipment.map(item => `
                    <div class="equipment-item">
                        <div>
                            <div class="equipment-name">${item.name}</div>
                            <div class="equipment-option">${item.option}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : `
            <div style="margin-top: 15px; padding: 15px; background: #fef3cd; border-radius: 6px; border: 1px solid #f59e0b;">
                <strong>Hinweis:</strong> Keine spezifische Ausstattung ausgewählt. Wir beraten Sie gerne zu den passenden Optionen.
            </div>
            `}
        </div>

        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">🎨</span>
                Fliesen & Heizung
            </h2>
            <div class="tiles-grid">
                <div class="tile-category">
                    <h4>Bodenfliesen</h4>
                    <div class="tile-list">
                        ${bathroomData.floorTiles?.length > 0 ? 
                            bathroomData.floorTiles.join('<br>') : 
                            '<em>Keine spezifischen Bodenfliesen ausgewählt</em>'
                        }
                    </div>
                </div>
                <div class="tile-category">
                    <h4>Wandfliesen</h4>
                    <div class="tile-list">
                        ${bathroomData.wallTiles?.length > 0 ? 
                            bathroomData.wallTiles.join('<br>') : 
                            '<em>Keine spezifischen Wandfliesen ausgewählt</em>'
                        }
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="color: #1e3a8a; margin-bottom: 10px;">🔥 Heizung</h4>
                <div class="tile-list">
                    ${bathroomData.heating?.length > 0 ? 
                        bathroomData.heating.join('<br>') : 
                        '<em>Keine spezifische Heizung ausgewählt</em>'
                    }
                </div>
            </div>
        </div>

        ${additionalInfoList.length > 0 ? `
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">📋</span>
                Gewünschte Informationen
            </h2>
            <div class="additional-info-list">
                ${additionalInfoList.map(info => `
                    <div class="info-item">
                        ✓ ${info}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${comments ? `
        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">💬</span>
                Anmerkungen
            </h2>
            <div class="comments-section">
                ${comments.replace(/\n/g, '<br>')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2 class="section-title">
                <span class="section-icon">📞</span>
                Nächste Schritte
            </h2>
            <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <h4 style="color: #1e3a8a; margin-bottom: 15px;">Wir melden uns bei Ihnen!</h4>
                <p style="margin-bottom: 15px;">
                    Basierend auf Ihrer Konfiguration erstellen wir Ihnen ein individuelles Angebot. 
                    Unser Expertenteam wird sich innerhalb der nächsten 24 Stunden bei Ihnen melden.
                </p>
                <div class="info-grid" style="margin-top: 15px;">
                    <div class="info-label">Kontakt:</div>
                    <div class="info-value">${process.env.COMPANY_PHONE || '030 76008921'}</div>
                    
                    <div class="info-label">E-Mail:</div>
                    <div class="info-value">${process.env.COMPANY_EMAIL || 'hey@mitra-sanitaer.de'}</div>
                    
                    <div class="info-label">Adresse:</div>
                    <div class="info-value">${process.env.COMPANY_ADDRESS || 'Borussiastraße 62a'}<br>${process.env.COMPANY_CITY || '12103 Berlin'}</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-info">
                <strong>${process.env.COMPANY_NAME || 'Mitra Sanitär GmbH'}</strong><br>
                ${process.env.COMPANY_ADDRESS || 'Borussiastraße 62a'} | ${process.env.COMPANY_CITY || '12103 Berlin'}<br>
                Tel: ${process.env.COMPANY_PHONE || '030 76008921'} | E-Mail: ${process.env.COMPANY_EMAIL || 'hey@mitra-sanitaer.de'}<br><br>
                <em>Dieses Dokument wurde automatisch generiert am ${moment().format('DD.MM.YYYY HH:mm:ss')}</em><br>
                <em>Referenz-ID: BATHROOM-${uuidv4().substr(0, 8)}</em>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Debug PDFs auflisten
   */
  async listDebugPDFs() {
    try {
      const files = await fs.readdir(this.outputDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      const pdfs = await Promise.all(
        pdfFiles.map(async (file) => {
          const filePath = path.join(this.outputDir, file);
          const stats = await fs.stat(filePath);
          
          return {
            filename: file,
            size: `${(stats.size / 1024).toFixed(2)} KB`,
            created: moment(stats.birthtime).format('DD.MM.YYYY HH:mm:ss'),
            downloadUrl: process.env.PDF_DEBUG_MODE === 'true' ? 
              `http://localhost:${process.env.PORT || 3000}/debug/pdfs/${file}` : null
          };
        })
      );

      // Nach Erstellungsdatum sortieren (neueste zuerst)
      pdfs.sort((a, b) => new Date(b.created) - new Date(a.created));

      const totalSize = pdfs.reduce((sum, pdf) => {
        return sum + parseFloat(pdf.size.replace(' KB', ''));
      }, 0);

      return {
        pdfs: pdfs,
        totalSize: `${totalSize.toFixed(2)} KB`,
        outputDirectory: this.outputDir
      };

    } catch (error) {
      logger.error('Fehler beim Auflisten der Debug-PDFs:', error);
      return {
        pdfs: [],
        totalSize: '0 KB',
        outputDirectory: this.outputDir
      };
    }
  }

  /**
   * Debug PDFs löschen
   */
  async clearDebugPDFs() {
    try {
      const files = await fs.readdir(this.outputDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      for (const file of pdfFiles) {
        const filePath = path.join(this.outputDir, file);
        await fs.unlink(filePath);
      }

      logger.pdf('Debug PDFs gelöscht', { count: pdfFiles.length });

      return {
        success: true,
        deletedCount: pdfFiles.length
      };

    } catch (error) {
      logger.error('Fehler beim Löschen der Debug-PDFs:', error);
      return {
        success: false,
        deletedCount: 0,
        error: error.message
      };
    }
  }
}

// Singleton Instance
const pdfService = new PDFService();

module.exports = pdfService;