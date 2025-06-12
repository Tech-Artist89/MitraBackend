# Mitra Sanitär Backend

Backend für die Mitra Sanitär Website mit Kontaktformular und Badkonfigurator.

## ✨ Features

- 📧 **Kontaktformular** - Normale Kontaktanfragen mit E-Mail-Versendung
- 🛁 **Badkonfigurator** - Komplexe Badkonfigurationen mit PDF-Generierung
- 📄 **PDF-Generierung** - Automatische PDF-Erstellung für Badkonfigurationen
- 🔒 **Sicherheit** - Rate Limiting, Input Validation, CORS
- 📊 **Logging** - Umfassendes Logging System
- 🐛 **Debug-Modus** - PDF Debug-Features für Entwicklung

## 🚀 Quick Start

### 1. Installation

```bash
# In den Backend-Ordner wechseln
cd mitra-sanitaer-backend

# Dependencies installieren
npm install
```

### 2. Umgebungsvariablen konfigurieren

Kopiere die `.env` Datei und passe die Werte an:

```bash
# .env Datei bearbeiten
nano .env
```

**Wichtige Konfigurationen:**

```env
# E-Mail Konfiguration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=deine-email@gmail.com
EMAIL_PASS=dein-app-passwort
EMAIL_TO=hey@mitra-sanitaer.de

# Server
PORT=3000
NODE_ENV=development
```

### 3. Gmail App-Passwort einrichten

1. Gehe zu deinem Google-Konto
2. Sicherheit → 2-Faktor-Authentifizierung aktivieren
3. App-Passwörter → Neues App-Passwort generieren
4. Kopiere das 16-stellige Passwort in die `.env` Datei

### 4. Backend starten

```bash
# Entwicklungsmodus (mit Auto-Reload)
npm run dev

# Produktionsmodus
npm start
```

Das Backend läuft jetzt auf `http://localhost:3000`

## 📡 API Endpunkte

### Health Check
```
GET /api/health
```
Prüft ob das Backend läuft.

### Kontaktformular
```
POST /api/contact
```
Sendet normale Kontaktanfragen.

**Request Body:**
```json
{
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@beispiel.de",
  "phone": "030 123456789",
  "subject": "Beratungsanfrage",
  "message": "Ich hätte gerne...",
  "service": "bathroom",
  "urgent": false
}
```

### Badkonfigurator
```
POST /api/send-bathroom-configuration
```
Sendet Badkonfigurationen mit PDF-Anhang.

**Request Body:**
```json
{
  "contactData": {
    "salutation": "Herr",
    "firstName": "Max",
    "lastName": "Mustermann",
    "phone": "030 123456789",
    "email": "max@beispiel.de"
  },
  "bathroomData": {
    "equipment": [...],
    "bathroomSize": 8,
    "qualityLevel": {...},
    "floorTiles": [...],
    "wallTiles": [...],
    "heating": [...]
  },
  "comments": "Zusätzliche Anmerkungen",
  "additionalInfo": {
    "projektablauf": true,
    "garantie": false
  }
}
```

### PDF Test (nur Development)
```
POST /api/generate-pdf-only
```
Generiert nur ein PDF ohne E-Mail zu senden.

### Debug PDFs (nur Development)
```
GET /api/debug-pdfs
DELETE /api/debug-pdfs
```
Listet generierte PDFs auf oder löscht sie.

## 🔧 Konfiguration

### E-Mail Provider

**Gmail (empfohlen):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=deine-email@gmail.com
EMAIL_PASS=app-passwort
```

**Andere Provider:**
```env
# Outlook/Hotmail
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587

# Custom SMTP
EMAIL_HOST=dein-smtp-server.de
EMAIL_PORT=587
EMAIL_USER=dein-username
EMAIL_PASS=dein-passwort
```

### PDF-Konfiguration

```env
# PDF Output Verzeichnis
PDF_OUTPUT_DIR=./generated-pdfs

# Debug Modus (PDFs über HTTP verfügbar)
PDF_DEBUG_MODE=true
```

### Rate Limiting

```env
# 10 Requests pro 15 Minuten
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10
```

## 🛠️ Development

### Logs anzeigen

```bash
# Live Logs verfolgen
tail -f logs/combined.log

# Error Logs
tail -f logs/error.log
```

### Debug PDFs verwalten

Im Debug-Modus sind PDFs unter `http://localhost:3000/debug/pdfs/` verfügbar.

```bash
# Alle Debug PDFs auflisten
curl http://localhost:3000/api/debug-pdfs

# Debug PDFs löschen
curl -X DELETE http://localhost:3000/api/debug-pdfs
```

### API testen

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Kontaktformular:**
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@beispiel.de",
    "subject": "Test Anfrage",
    "message": "Das ist eine Test-Nachricht"
  }'
```

## 📂 Projektstruktur

```
mitra-sanitaer-backend/
├── logs/                    # Log-Dateien
├── generated-pdfs/          # Generierte PDFs (Debug)
├── routes/
│   └── api.js              # API Routes
├── services/
│   ├── emailService.js     # E-Mail Funktionalität
│   └── pdfService.js       # PDF Generierung
├── middleware/
│   └── validation.js       # Input Validation
├── utils/
│   └── logger.js           # Logging System
├── .env                    # Umgebungsvariablen
├── .gitignore             # Git Ignore Rules
├── package.json           # Dependencies
├── server.js              # Haupt-Server
└── README.md              # Diese Datei
```

## 🚨 Troubleshooting

### Backend startet nicht

1. **Port bereits belegt:**
   ```bash
   # Prüfe welcher Prozess Port 3000 nutzt
   lsof -i :3000
   
   # Oder anderen Port in .env setzen
   PORT=3001
   ```

2. **Node.js Version:**
   ```bash
   # Node.js Version prüfen (mind. v16 erforderlich)
   node --version
   ```

### E-Mails kommen nicht an

1. **Gmail App-Passwort prüfen:**
   - 2FA muss aktiviert sein
   - 16-stelliges App-Passwort verwenden
   - Nicht das normale Google-Passwort

2. **SMTP-Einstellungen prüfen:**
   ```bash
   # E-Mail Test über Node.js
   node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransporter({
     host: 'smtp.gmail.com',
     port: 587,
     auth: { user: 'deine-email', pass: 'app-passwort' }
   });
   transporter.verify().then(console.log).catch(console.error);
   "
   ```

3. **Logs prüfen:**
   ```bash
   tail -f logs/error.log
   ```

### PDF-Generierung schlägt fehl

1. **Puppeteer Dependencies:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y chromium-browser
   
   # macOS
   brew install chromium
   ```

2. **Speicherplatz prüfen:**
   ```bash
   df -h
   ```

### Frontend kann Backend nicht erreichen

1. **CORS prüfen:**
   ```env
   FRONTEND_URL=http://localhost:4200
   ```

2. **Backend läuft:**
   ```bash
   curl http://localhost:3000/api/health
   ```

## 📧 Support

Bei Problemen:

1. Logs prüfen: `logs/error.log`
2. Health-Check aufrufen: `http://localhost:3000/api/health`
3. Dependencies aktualisieren: `npm update`

## 🔄 Updates

```bash
# Dependencies aktualisieren
npm update

# Sicherheitsupdates
npm audit fix
```

## 📋 Produktions-Deployment

1. **Umgebungsvariablen setzen:**
   ```env
   NODE_ENV=production
   PDF_DEBUG_MODE=false
   ```

2. **PM2 für Prozess-Management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name mitra-backend
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx):**
   ```nginx
   location /api {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }
   ```

---

**Erstellt für Mitra Sanitär GmbH** 🛁