# Note Flow

This is a modern, responsive note taking application built to help you capture ideas effortlessly. It allows users to seamlessly create, read, update, and delete (CRUD) notes. It provides features like folder management, rich text formatting, and dark mode support. The app is designed to work fluidly on both web and mobile environments.

## Features

- **Notes Management**: Create, view, edit, and delete notes.
- **Folder Organization**: Categorize notes efficiently with custom folders.
- **Dark/Light Mode**: User preference based theme toggling.
- **Cross-Platform**: Built for Web, iOS, and Android support via Capacitor.
- **Cloud Syncing**: Data synchronization using Firebase Firestore.

## Tech Stack

- **Frontend**: React (v19.2) + Vite
- **Styling**: Tailwind CSS
- **Database / Auth**: Firebase (Firestore & Authentication)
- **Mobile runtime**: Capacitor
- **Icons**: Lucide React

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Mobile Development

- Sync web assets to capacitor:
  ```bash
  npm run mobile:build
  ```

- Open Android project in Android Studio:
  ```bash
  npm run mobile:open
  ```

## Security Warning
If you have ever hardcoded API keys or other secrets (such as Firebase credentials, Gemini API keys, Supabase keys, Stripe keys, etc.) during development, those values might still exist in your git history. 

**It is strongly recommended to immediately rotate any previously hardcoded secrets before deploying this application.**

## Environment Variables
This project uses environment variables for sensitive data. Please copy `.env.example` to `.env` and fill in your values. Never commit the `.env` file to version control.
