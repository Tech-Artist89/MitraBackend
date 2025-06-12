#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

// Test Data
const testContactForm = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@beispiel.de',
  phone: '030 123456789',
  subject: 'Test Anfrage',
  message: 'Das ist eine Test-Nachricht für das Kontaktformular.',
  service: 'bathroom',
  urgent: false
};

const testBathroomConfiguration = {
  contactData: {
    salutation: 'Herr',
    firstName: 'Max',
    lastName: 'Mustermann',
    phone: '030 987654321',
    email: 'max.mustermann@beispiel.de'
  },
  bathroomData: {
    equipment: [
      {
        id: 'bathtub',
        name: 'Badewanne',
        selected: true,
        imageUrl: '',
        iconUrl: '',
        popupDetails: {
          options: [
            {
              id: 'bathtub-standard',
              name: 'Standard Badewanne',
              description: 'Klassische Badewanne',
              imageUrl: '',
              selected: true
            }
          ]
        }
      },
      {
        id: 'shower',
        name: 'Dusche',
        selected: true,
        imageUrl: '',
        iconUrl: '',
        popupDetails: {
          options: [
            {
              id: 'shower-glass',
              name: 'Glasdusche',
              description: 'Moderne Glasdusche',
              imageUrl: '',
              selected: true
            }
          ]
        }
      }
    ],
    bathroomSize: 8,
    qualityLevel: {
      id: 'premium',
      name: 'Premium',
      description: 'Hochwertige Materialien und Ausstattung',
      imageUrl: '',
      selected: true,
      features: ['Marken-Armaturen', 'Premium Fliesen', '10 Jahre Garantie']
    },
    floorTiles: ['Feinsteinzeug', 'Naturstein'],
    wallTiles: ['Keramik', 'Mosaik'],
    heating: ['Fußbodenheizung', 'Handtuchheizkörper'],
    additionalInfo: [],
    comments: ''
  },
  comments: 'Bitte kontaktieren Sie mich für einen Beratungstermin.',
  additionalInfo: {
    projektablauf: true,
    garantie: true,
    referenzen: false,
    foerderung: true
  }
};

// Test Funktionen
async function testHealthCheck() {
  console.log('🏥 Health Check Test...');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health Check erfolgreich');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Uptime: ${response.data.uptime}s`);
    return true;
  } catch (error) {
    console.log('❌ Health Check fehlgeschlagen');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testContactForm() {
  console.log('\n📧 Kontaktformular Test...');
  try {
    const response = await axios.post(`${BASE_URL}/api/contact`, testContactForm);
    console.log('✅ Kontaktformular erfolgreich');
    console.log(`   Reference ID: ${response.data.referenceId}`);
    console.log(`   Message: ${response.data.message}`);
    return true;
  } catch (error) {
    console.log('❌ Kontaktformular fehlgeschlagen');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.message}`);
      if (error.response.data.errors) {
        console.log(`   Validation Errors:`, error.response.data.errors);
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testBathroomConfig() {
  console.log('\n🛁 Badkonfigurator Test...');
  try {
    const response = await axios.post(`${BASE_URL}/api/send-bathroom-configuration`, testBathroomConfiguration);
    console.log('✅ Badkonfigurator erfolgreich');
    console.log(`   Reference ID: ${response.data.referenceId}`);
    console.log(`   PDF Generated: ${response.data.pdfGenerated}`);
    console.log(`   Email Sent: ${response.data.emailSent}`);
    if (response.data.debug) {
      console.log(`   PDF Download: ${response.data.debug.downloadUrl}`);
    }
    return true;
  } catch (error) {
    console.log('❌ Badkonfigurator fehlgeschlagen');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.message}`);
      if (error.response.data.errors) {
        console.log(`   Validation Errors:`, error.response.data.errors);
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testPDFOnly() {
  console.log('\n📄 PDF Generation Test...');
  try {
    const response = await axios.post(`${BASE_URL}/api/generate-pdf-only`, testBathroomConfiguration);
    console.log('✅ PDF Generation erfolgreich');
    console.log(`   Filename: ${response.data.debug.filename}`);
    console.log(`   Size: ${response.data.debug.pdfSize}`);
    if (response.data.debug.downloadUrl) {
      console.log(`   Download: ${response.data.debug.downloadUrl}`);
    }
    return true;
  } catch (error) {
    console.log('❌ PDF Generation fehlgeschlagen');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.message}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testDebugPDFs() {
  console.log('\n🐛 Debug PDFs Test...');
  try {
    const response = await axios.get(`${BASE_URL}/api/debug-pdfs`);
    console.log('✅ Debug PDFs erfolgreich');
    console.log(`   PDF Count: ${response.data.count}`);
    console.log(`   Total Size: ${response.data.totalSize}`);
    
    if (response.data.pdfs.length > 0) {
      console.log('   PDFs:');
      response.data.pdfs.slice(0, 3).forEach(pdf => {
        console.log(`     - ${pdf.filename} (${pdf.size})`);
      });
      if (response.data.pdfs.length > 3) {
        console.log(`     ... und ${response.data.pdfs.length - 3} weitere`);
      }
    }
    return true;
  } catch (error) {
    console.log('❌ Debug PDFs fehlgeschlagen');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.message}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

async function testEmailService() {
  console.log('\n📨 E-Mail Service Test...');
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.verify();
    console.log('✅ E-Mail Service Verbindung erfolgreich');
    console.log(`   Host: ${process.env.EMAIL_HOST}`);
    console.log(`   User: ${process.env.EMAIL_USER}`);
    return true;
  } catch (error) {
    console.log('❌ E-Mail Service Verbindung fehlgeschlagen');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Tipps:');
    console.log('   - Prüfe EMAIL_USER und EMAIL_PASS in .env');
    console.log('   - Für Gmail: App-Passwort verwenden');
    console.log('   - 2FA muss für Gmail aktiviert sein');
    return false;
  }
}

// Main Test Runner
async function runTests() {
  const args = process.argv.slice(2);
  const testType = args[0];

  console.log('🧪 Mitra Sanitär Backend Tests');
  console.log('================================\n');

  let results = [];

  if (!testType || testType === 'all') {
    console.log('🚀 Führe alle Tests aus...\n');
    
    results.push(await testHealthCheck());
    results.push(await testEmailService());
    results.push(await testContactForm());
    results.push(await testPDFOnly());
    results.push(await testBathroomConfig());
    results.push(await testDebugPDFs());
    
  } else {
    switch (testType.toLowerCase()) {
      case 'health':
        results.push(await testHealthCheck());
        break;
      case 'email':
        results.push(await testEmailService());
        break;
      case 'contact':
        results.push(await testContactForm());
        break;
      case 'bathroom':
        results.push(await testBathroomConfig());
        break;
      case 'pdf':
        results.push(await testPDFOnly());
        break;
      case 'debug':
        results.push(await testDebugPDFs());
        break;
      default:
        console.log(`❌ Unbekannter Test: ${testType}`);
        console.log('Verfügbare Tests: health, email, contact, bathroom, pdf, debug, all');
        process.exit(1);
    }
  }

  // Ergebnisse
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Ergebnisse: ${passed}/${total} erfolgreich`);
  
  if (passed === total) {
    console.log('🎉 Alle Tests bestanden!');
    process.exit(0);
  } else {
    console.log('⚠️  Einige Tests fehlgeschlagen. Prüfe die Konfiguration.');
    process.exit(1);
  }
}

// Usage Information
function showUsage() {
  console.log('📋 Test Script Usage:');
  console.log('  npm run test          # Alle Tests');
  console.log('  npm run test health   # Health Check');
  console.log('  npm run test email    # E-Mail Service');
  console.log('  npm run test contact  # Kontaktformular');
  console.log('  npm run test bathroom # Badkonfigurator');
  console.log('  npm run test pdf      # PDF Generation');
  console.log('  npm run test debug    # Debug PDFs');
}

// Direkter Aufruf
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  runTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testContactForm,
  testBathroomConfig,
  testPDFOnly,
  testDebugPDFs,
  testEmailService
};