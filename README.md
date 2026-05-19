# Docufiy Notes

A clean, offline note-taking Android app focused on English and Hinglish-to-Hindi typing, rich text editing, image insertion, OCR text extraction, and export to PDF/PNG.

## Features

### Core
- **Rich Text Editor** — Block-based editor with bold, italic, underline, font size, text/highlight colors, alignment, bullets, and numbered lists
- **Hinglish → Hindi Transliteration** — Type in Hinglish (e.g., "mera naam vivek hai") and get Hindi text ("मेरा नाम विवेक है") with suggestion chips
- **OCR Import** — On-device text recognition using Google ML Kit (Latin + Devanagari)
- **Image Handling** — Insert, resize, compress, and delete images within notes
- **Export** — Export notes as PDF, PNG, or TXT with configurable page size, resolution, and quality
- **100% Offline** — No login, no ads, no cloud. All data stays on your device

### Screens
1. **Home** — Quick actions, recent notes, favorites, and search
2. **Note Editor** — Full rich text editing with floating formatting toolbar
3. **Saved Notes** — List/grid view with search, sort, rename, duplicate, delete, share, export
4. **History** — Recently edited, exported, and deleted notes with restore capability
5. **OCR Import** — Pick image/PDF and extract text with ML Kit
6. **Export** — PDF/PNG/TXT export with page size, resolution, and quality options
7. **Settings** — Dark/light mode, accent color customization, auto-save, default font size, typing mode

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Kotlin |
| UI | Jetpack Compose + Material 3 |
| Architecture | MVVM |
| Database | Room |
| Preferences | DataStore |
| Navigation | Navigation Compose |
| Async | Kotlin Coroutines + Flow |
| DI | Hilt |
| OCR | Google ML Kit (on-device) |
| Images | Coil |
| Min SDK | 29 (Android 10) |
| Target SDK | 35 (Android 15+) |

## Project Structure

```
app/src/main/java/com/docufiy/notes/
├── data/
│   ├── local/          # Room database, DAOs, entities
│   ├── preferences/    # DataStore preferences
│   └── repository/     # Repository pattern
├── di/                 # Hilt dependency injection modules
├── navigation/         # Navigation graph
├── ui/
│   ├── theme/          # Material 3 theming
│   ├── home/           # Home screen
│   ├── editor/         # Note editor + formatting toolbar
│   ├── saved/          # Saved notes list/grid
│   ├── history/        # History screen
│   ├── ocr/            # OCR import screen
│   ├── export/         # Export screen
│   └── settings/       # Settings screen
└── util/               # Transliterator, image utils, export utils
```

## Building

1. Open in Android Studio (Hedgehog or newer)
2. Sync Gradle
3. Run on device/emulator (API 29+)

```bash
./gradlew assembleDebug
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `notes` | Note metadata (title, timestamps, favorite, background color) |
| `note_blocks` | Block-based content (text, heading, bullet, numbered, image, OCR) |
| `note_images` | Image metadata linked to notes |
| `note_history` | Edit/export/delete history |
| `note_exports` | Export records |
| `deleted_notes` | Soft-deleted note backups for restore |

## Privacy

- 100% offline — no network calls
- No login or account required
- No ads or tracking
- No cloud upload
- All notes stored locally on device
