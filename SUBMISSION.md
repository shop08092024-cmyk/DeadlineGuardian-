# Hackathon Submission: Deadline Guardian

This document contains a structured Devpost-style submission template to help you package and submit your project before the 11:59 PM deadline. You can copy this text directly into your hackathon portal.

---

## 🌌 Project Pitch Outline

### 💡 Inspiration
Reminders are broken. Every student, professional, and entrepreneur has experienced the dread of seeing a passive calendar notification, swiping it away to "deal with it later," and ultimately missing a critical deadline. Traditional productivity apps behave like passive checklists. We wanted to build a proactive companion—a **Chief of Staff** that doesn't just remind you of a deadline, but actively helps you rearrange your life, simulates the cost of your procrastination, drafts your deliverables, and coaches you to the finish line.

### 🛡️ What it Does
**Deadline Guardian** is an autonomous AI-powered productivity companion built to transform passive tracking into proactive completion:
1. **Intelligent AI Architect Planner**: Decomposes any complex goal (e.g. "Prepare for Google SWE Interview") into realistic tasks, estimates hours, and sets exact dependencies based on the deadline.
2. **Accountability Coach Chat**: A conversational Chief of Staff coach that tracks active progress, identifies schedule risks, and coaches you on time management.
3. **Future Workload Simulator**: Lets you simulate procrastination scenarios (e.g. "Skip today's study block") and shows the immediate impact on your success probability and deadline drift.
4. **Smart Inbox Radar**: Scans messy email notifications or recruiter chats, extracts tasks and dates automatically, and injects them into your workspace.
5. **Autonomous Action Agent**: Instantly generates roadmaps, email drafts, and reminders based on your goal context.
6. **Focus Audio Engine**: Built-in Synthesizer using the browser's native **Web Audio API** (Lofi, White/Brown Noise, Binaural Beats) to lock in focus without leaving the tab.
7. **Hands-free Voice Input**: Integrated voice speech-to-text to let you talk naturally to your Accountability Coach.
8. **Cloud & Local Hybrid Storage**: Dual-write mechanism that replicates data to **Supabase** while retaining a local JSON database fallback for offline stability.

### ⚙️ How We Built It
* **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons, and custom Glassmorphic styles.
* **Backend**: Node.js, Express, TypeScript, and `tsx` execution wrappers.
* **AI Model**: Google Gen AI SDK utilizing `gemini-2.0-flash-lite` for high-speed, structured JSON generation.
* **Database**: Supabase client for remote syncing with a local file-based database for offline sandbox testing.
* **Audio & Voice**: Web Audio API and Web Speech API.

### 🧗 Challenges We Ran Into
* **Ensuring API Stability**: To prevent server crashes during free-tier API rate limits or network dropouts, we built an async race wrapper that automatically swaps AI calls with high-fidelity, keyword-aware fallback data generator templates if a call exceeds a 12-second timeout or hits quota limits.
* **Strict Type Safety**: Ensuring type parity between dynamically generated AI JSON schemas and frontend state models required robust interface constraints.
* **Audio Loop Engineering**: Synthesizing high-quality, continuous noises (like brown noise or binaural beats) purely from math formulas using the Web Audio API without downloading external audio files to keep the app footprint small.

### 🏆 Accomplishments We're Proud Of
* **100% Feature Coverage**: Fully implemented every single feature listed in the example statement.
* **Zero-config Fallback**: The server auto-detects absent environment variables or database connection losses and falls back to a fully functional local sandbox without crashing.
* **Web Audio Focus Player**: High-fidelity sound generator that operates 100% client-side with no network requests or external assets.

### 📚 What We Learned
* How to orchestrate multiple prompt profiles (Planner, Coach, Simulator, Radar) working in harmony.
* How to design highly resilient full-stack applications that gracefully recover when external cloud resources fail.

### 🚀 What's Next for Deadline Guardian
* **Calendar Push**: Extending the Google Calendar sync to native desktop/mobile integrations.
* **Browser Extension**: An extension that scans your active browser tab (like a Canvas page or Jira board) and runs the Radar agent automatically.
* **Predictive Sleep Schedules**: Integrating with wearable health data to suggest focus windows matching circadian cycles.
