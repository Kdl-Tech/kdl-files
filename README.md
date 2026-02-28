# KDL Files

Organiseur de fichiers professionnel — open source, gratuit, multi-plateforme.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey)

## Fonctionnalités

- **Explorateur de fichiers** — navigation, vue liste/grille, aperçu, raccourcis clavier
- **Recherche indexée** — trouver un fichier en millisecondes (SQLite)
- **Détection de doublons** — par hash MD5/SHA256, suppression assistée
- **Visualiseur d'espace disque** — treemap interactive, top 20 fichiers lourds
- **Organisation automatique** — règles configurables, dry-run, surveillance de dossiers
- **Batch rename** — patterns, numérotation, regex, aperçu en temps réel
- **Tags & métadonnées** — tags colorés, étoiles, notes sur les fichiers
- **Historique & undo** — annulation des opérations

## Installation

```bash
git clone https://github.com/Kdl-Tech/kdl-files.git
cd kdl-files
npm install
npm install --prefix client
npm run dev
```

## Build

```bash
# Linux
npm run build:linux

# Windows (via GitHub Actions recommandé)
npm run build:win

# macOS (via GitHub Actions recommandé)
npm run build:mac
```

## Licence

MIT — © 2026 KDL TECH
