# Deadline Guardian 🚀

**Deadline Guardian** is an AI-powered Autonomous Productivity Chief of Staff designed for the Gemini API Developer Competition ("The Last-Minute Life Saver"). It helps students, professionals, and entrepreneurs proactively manage their tasks, avoid missing deadlines, and stay focused using a suite of AI-driven productivity tools.

## Features ✨
- **Dynamic Task Management**: Break down complex goals into sub-tasks with real-time status tracking.
- **AI Accountability Coach**: Powered by Google's Gemini, this coach proactively analyzes your deadlines, categorizes them, and provides actionable advice. It even supports **Voice Interactions** via browser speech recognition!
- **Deep Work Tools**: Built-in Pomodoro timer and ambient lo-fi/nature beats to keep you focused on your work.
- **Premium Google Material Design 3 UI**: Clean, intuitive, and highly responsive interface optimized for both desktop and mobile.
- **Resilient Architecture**: Uses a smart local fallback sandbox (`data.json`) if cloud environments (like Supabase) are unavailable, ensuring you never lose your progress.

## Running Locally 💻

**Prerequisites:** Node.js installed on your machine.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Rename `.env.example` to `.env.local` (or `.env`) and add your Gemini API Key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Optional)* If you are using Supabase for cloud sync, configure the Supabase URL and Anon Key as well. Otherwise, the app will safely fall back to Local Sandbox Mode.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   Navigate to `http://localhost:5173` to see your AI Chief of Staff in action!

## Deployment 🌐
This project is fully compatible with modern static hosting platforms like Vercel, Netlify, or Render. Simply connect your GitHub repository and set the build command to `npm run build` and output directory to `dist`.

---
*Built with React, Vite, Tailwind CSS, and the powerful Google Gemini API.*
