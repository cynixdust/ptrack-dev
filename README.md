# ScrumFlow - Project Tracker Pro

A professional, high-performance strategy and task tracker built with React, Express, and SQLite.

## 🚀 Key Features
- **Strategy Management:** Plan and track high-level corporate or personal missions.
- **Kanban Board:** Interactive task board with real-time state management.
- **Persistent Storage:** Built-in SQLite database with user-specific data isolation.
- **Desktop Ready:** Packaged as a Windows executable using Electron and NSIS.

## 🔧 Installation & Development

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup
```bash
npm install
```

### Run Locally (Web)
```bash
npm run dev
```

### Run Locally (Desktop)
```bash
npm run electron:dev
```

## 📦 Building for Production

### Web Production Server
```bash
npm run build
npm start
```

### Package Desktop Installer (.exe)
```bash
npm run electron:build
```
The installer will be generated in the `dist-electron/` directory.

## ☁️ Deployment & CI/CD

### GitHub Actions
This repository is configured with a GitHub Action that automatically:
1. Builds the application on every push to `main`.
2. Creates a **GitHub Release** when a version tag (e.g., `v1.0.0`) is pushed.

### Hosting the Web Server
For hosting the live web application, we recommend:
- **Google Cloud Run:** Use the "Deploy to Cloud Run" feature in AI Studio.
- **VPS:** Clone this repo and use `pm2` to manage the `npm start` process.

---
*Created by gcbannermanhyde@gmail.com using AI Studio.*
