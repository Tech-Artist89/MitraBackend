# 🚀 Mitra Sanitär Backend - Installation Guide

Detaillierte Anleitung zur Installation und Konfiguration des Backends.

## 📋 Voraussetzungen

### System Requirements
- **Node.js**: Version 16 oder höher
- **npm**: Version 8 oder höher  
- **RAM**: Mindestens 1GB (für PDF-Generierung)
- **Festplatte**: Mindestens 2GB freier Speicher

### Betriebssystem
- ✅ Ubuntu 20.04+ / Debian 11+
- ✅ CentOS 8+ / RHEL 8+
- ✅ macOS 10.15+
- ✅ Windows 10+ (mit Node.js)

### Node.js Installation prüfen
```bash
node --version  # Sollte v16+ anzeigen
npm --version   # Sollte v8+ anzeigen
```

## 🛠️ Schritt-für-Schritt Installation

### 1. Projekt Setup

```bash
# In Backend-Ordner wechseln
cd mitra-sanitaer-backend

# Dependencies installieren
npm install

# Setup-Script ausführen (interaktive Konfiguration)
npm run setup
```

### 2. Manuelle Konfiguration (Alternative)

Falls das Setup-Script nicht funktioniert:

```bash
# .env Datei erstellen
cp .env.example .env

# .env Datei bearbeiten
nano .env
```

#### Minimale .env Konfiguration:
```env
# Server
PORT=3000
NODE_ENV=development

# E-Mail (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=deine-email@gmail.com
EMAIL_PASS=dein-app-passwort
EMAIL_TO=hey@mitra-sanitaer.de

# Firma
COMPANY_NAME="Mitra Sanitär GmbH"
COMPANY_EMAIL="hey@mitra-sanitaer.de"
COMPANY_PHONE="030 76008921"

# Frontend
FRONTEND_URL=http://localhost:4200
```

### 3. Gmail App-Passwort einrichten

#### Für Gmail (empfohlen):

1. **2-Faktor-Authentifizierung aktivieren:**
   - Gehe zu [Google Account Settings](https://myaccount.google.com/security)
   - Aktiviere "2-Step Verification"

2. **App-Passwort generieren:**
   - Gehe zu "App passwords" (App-Passwörter)
   - Wähle "Mail" und "Other (Custom name)"
   - Gib "Mitra Backend" als Namen ein
   - Kopiere das 16-stellige Passwort
   - Füge es in die `.env` Datei ein

3. **WICHTIG:** 
   - Verwende das App-Passwort, NICHT dein normales Google-Passwort
   - Das App-Passwort hat das Format: `abcd efgh ijkl mnop`

### 4. Verzeichnisse erstellen

```bash
# Automatisch durch Setup-Script oder manuell:
mkdir -p logs generated-pdfs
```

### 5. Backend starten

```bash
# Development (mit Auto-Reload)
npm run dev

# Production
npm start
```

## 🧪 Installation testen

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

Erwartete Antwort:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "Mitra Sanitär Backend"
}
```

### 2. Vollständiger Test
```bash
npm run test
```

### 3. E-Mail Service Test
```bash
npm run test email
```

### 4. PDF Test
```bash
npm run test pdf
```

## 🔧 Konfiguration für verschiedene Provider

### Gmail
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=deine-email@gmail.com
EMAIL_PASS=app-passwort
```

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=deine-email@outlook.com
EMAIL_PASS=dein-passwort
```

### Custom SMTP
```env
EMAIL_HOST=dein-smtp-server.de
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=dein-username
EMAIL_PASS=dein-passwort
```

### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=dein-sendgrid-api-key
```

## 🚢 Production Deployment

### Option 1: PM2 (empfohlen)

```bash
# PM2 global installieren
npm install -g pm2

# Production Environment setzen
export NODE_ENV=production

# Mit PM2 starten
pm2 start ecosystem.config.js --env production

# Autostart beim Neustart
pm2 startup
pm2 save

# Status prüfen
pm2 status
pm2 logs mitra-sanitaer-backend
```

### Option 2: Docker

```bash
# Image bauen
docker build -t mitra-sanitaer-backend .

# Container starten
docker run -d \
  --name mitra-backend \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/generated-pdfs:/app/generated-pdfs \
  mitra-sanitaer-backend

# Oder mit Docker Compose
docker-compose up -d
```

### Option 3: Systemd Service

```bash
# Service Datei erstellen
sudo nano /etc/systemd/system/mitra-backend.service
```

```ini
[Unit]
Description=Mitra Sanitär Backend
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/var/www/mitra-sanitaer-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/mitra-sanitaer-backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Service aktivieren
sudo systemctl enable mitra-backend
sudo systemctl start mitra-backend
sudo systemctl status mitra-backend
```

## 🔒 Reverse Proxy Setup (Nginx)

### 1. Nginx installieren
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Konfiguration
```bash
sudo nano /etc/nginx/sites-available/mitra-backend
```

Inhalt der bereitgestellten `nginx.conf` verwenden.

### 3. Site aktivieren
```bash
sudo ln -s /etc/nginx/sites-available/mitra-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Monitoring & Logging

### Log-Dateien
```bash
# Backend Logs
tail -f logs/combined.log
tail -f logs/error.log

# PM2 Logs
pm2 logs mitra-sanitaer-backend

# Nginx Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Monitoring
```bash
# Health Check Script erstellen
nano health-check.sh
```

```bash
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $response != "200" ]; then
    echo "Backend is down! Status: $response"
    # Optional: Restart service
    # pm2 restart mitra-sanitaer-backend
fi
```

```bash
chmod +x health-check.sh

# Cronjob einrichten (alle 5 Minuten)
crontab -e
# Hinzufügen: */5 * * * * /path/to/health-check.sh
```

## 🐛 Troubleshooting

### Backend startet nicht

**1. Port bereits belegt:**
```bash
# Prüfen welcher Prozess Port 3000 nutzt
sudo lsof -i :3000
sudo netstat -tulpn | grep 3000

# Prozess beenden oder anderen Port verwenden
```

**2. Permissions-Probleme:**
```bash
# Berechtigungen prüfen
ls -la logs/ generated-pdfs/

# Berechtigungen setzen
chmod 755 logs/ generated-pdfs/
chown -R $USER:$USER logs/ generated-pdfs/
```

### E-Mails kommen nicht an

**1. SMTP-Verbindung testen:**
```bash
npm run test email
```

**2. Gmail-spezifische Probleme:**
- 2FA muss aktiviert sein
- App-Passwort verwenden (nicht normales Passwort)
- "Less secure app access" deaktivieren

**3. Firewall prüfen:**
```bash
# Port 587 (SMTP) muss erreichbar sein
telnet smtp.gmail.com 587
```

### PDF-Generierung schlägt fehl

**1. Puppeteer Dependencies installieren:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y chromium-browser

# CentOS/RHEL
sudo yum install chromium

# macOS
brew install chromium
```

**2. Speicherplatz prüfen:**
```bash
df -h
du -sh generated-pdfs/
```

**3. Puppeteer manuell testen:**
```bash
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await browser.close();
  console.log('Puppeteer works!');
})().catch(console.error);
"
```

### Frontend kann Backend nicht erreichen

**1. CORS-Konfiguration prüfen:**
```env
FRONTEND_URL=http://localhost:4200
```

**2. Backend-URL im Frontend prüfen:**
```typescript
// Angular: environment.ts
export const environment = {
  apiUrl: 'http://localhost:3000/api'
};
```

**3. Netzwerk-Verbindung testen:**
```bash
# Vom Frontend-Server aus
curl http://localhost:3000/api/health
```

## 💡 Performance Optimierung

### 1. PM2 Cluster Mode
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mitra-sanitaer-backend',
    script: 'server.js',
    instances: 'max', // Nutze alle CPU-Kerne
    exec_mode: 'cluster'
  }]
};
```

### 2. Redis für Rate Limiting
```bash
# Redis installieren
sudo apt install redis-server

# In .env hinzufügen:
REDIS_URL=redis://localhost:6379
```

### 3. Nginx Caching
```nginx
# In nginx.conf hinzufügen:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api/health {
    proxy_cache api_cache;
    proxy_cache_valid 200 1m;
    # ... andere Einstellungen
}
```

## 📞 Support

Bei weiteren Problemen:

1. **Logs prüfen:** `logs/error.log`
2. **Health-Check:** `curl http://localhost:3000/api/health`
3. **Test ausführen:** `npm run test`
4. **Dependencies aktualisieren:** `npm update`

---

**Viel Erfolg mit dem Backend-Setup! 🚀**