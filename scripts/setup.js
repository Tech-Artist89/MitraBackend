#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('🚀 Mitra Sanitär Backend Setup');
console.log('=================================\n');

async function setup() {
  try {
    // Prüfe ob .env bereits existiert
    const envPath = path.join(__dirname, '../.env');
    const envExists = await fs.pathExists(envPath);
    
    if (envExists) {
      const overwrite = await question('⚠️  .env Datei existiert bereits. Überschreiben? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('✅ Setup abgebrochen. Verwende vorhandene .env Datei.');
        process.exit(0);
      }
    }

    console.log('\n📧 E-Mail Konfiguration');
    console.log('Für Gmail: App-Passwort verwenden (nicht das normale Passwort!)');
    console.log('Anleitung: https://support.google.com/accounts/answer/185833\n');

    const emailUser = await question('E-Mail Adresse (für Versendung): ');
    const emailPass = await question('E-Mail Passwort/App-Passwort: ');
    const emailTo = await question('Ziel E-Mail (hey@mitra-sanitaer.de): ') || 'hey@mitra-sanitaer.de';
    
    console.log('\n🏢 Firmeninformationen');
    const companyName = await question('Firmenname (Mitra Sanitär GmbH): ') || 'Mitra Sanitär GmbH';
    const companyAddress = await question('Adresse (Borussiastraße 62a): ') || 'Borussiastraße 62a';
    const companyCity = await question('Ort (12103 Berlin): ') || '12103 Berlin';
    const companyPhone = await question('Telefon (030 76008921): ') || '030 76008921';
    const companyEmail = await question('Firmen-E-Mail (hey@mitra-sanitaer.de): ') || 'hey@mitra-sanitaer.de';

    console.log('\n⚙️  Server Konfiguration');
    const port = await question('Port (3000): ') || '3000';
    const nodeEnv = await question('Environment (development): ') || 'development';
    const frontendUrl = await question('Frontend URL (http://localhost:4200): ') || 'http://localhost:4200';
    const pdfDebugMode = await question('PDF Debug Modus (true): ') || 'true';

    // .env Inhalt generieren
    const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=${emailUser}
EMAIL_PASS=${emailPass}
EMAIL_FROM=${emailUser}
EMAIL_TO=${emailTo}

# Company Information
COMPANY_NAME="${companyName}"
COMPANY_ADDRESS="${companyAddress}"
COMPANY_CITY="${companyCity}"
COMPANY_PHONE="${companyPhone}"
COMPANY_EMAIL="${companyEmail}"

# PDF Configuration
PDF_OUTPUT_DIR=./generated-pdfs
PDF_DEBUG_MODE=${pdfDebugMode}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10

# Frontend URL (for CORS)
FRONTEND_URL=${frontendUrl}
`;

    // .env Datei schreiben
    await fs.writeFile(envPath, envContent);
    console.log('\n✅ .env Datei erstellt!');

    // Verzeichnisse erstellen
    const directories = [
      '../logs',
      '../generated-pdfs'
    ];

    for (const dir of directories) {
      const dirPath = path.join(__dirname, dir);
      await fs.ensureDir(dirPath);
      console.log(`📁 Verzeichnis erstellt: ${dir}`);
    }

    // package.json prüfen und Scripts hinzufügen
    const packagePath = path.join(__dirname, '../package.json');
    if (await fs.pathExists(packagePath)) {
      const packageJson = await fs.readJson(packagePath);
      
      // Setup Script hinzufügen
      if (!packageJson.scripts) packageJson.scripts = {};
      packageJson.scripts.setup = 'node scripts/setup.js';
      packageJson.scripts.test = 'node scripts/test.js';
      
      await fs.writeJson(packagePath, packageJson, { spaces: 2 });
      console.log('📦 package.json aktualisiert');
    }

    console.log('\n🎉 Setup erfolgreich abgeschlossen!');
    console.log('\n📋 Nächste Schritte:');
    console.log('1. npm install');
    console.log('2. npm run dev (für Development)');
    console.log('3. npm start (für Production)');
    console.log('\n🔍 Backend testen:');
    console.log(`   curl http://localhost:${port}/api/health`);
    
    if (pdfDebugMode === 'true') {
      console.log(`\n🐛 Debug Modus aktiviert:`);
      console.log(`   PDFs verfügbar unter: http://localhost:${port}/debug/pdfs/`);
      console.log(`   Debug API: http://localhost:${port}/api/debug-pdfs`);
    }

    console.log('\n📧 E-Mail Test:');
    console.log('   node scripts/test.js email');

  } catch (error) {
    console.error('\n❌ Fehler beim Setup:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Direkter Aufruf
if (require.main === module) {
  setup();
}

module.exports = { setup };