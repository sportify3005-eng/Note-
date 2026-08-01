# Note Flow

This is a note taking application.

## Security Warning
If you have ever hardcoded API keys or other secrets (such as Firebase credentials, Gemini API keys, Supabase keys, Stripe keys, etc.) during development, those values might still exist in your git history. 

**It is strongly recommended to immediately rotate any previously hardcoded secrets before deploying this application.**

## Environment Variables
This project uses environment variables for sensitive data. Please copy `.env.example` to `.env` and fill in your values. Never commit the `.env` file to version control.
