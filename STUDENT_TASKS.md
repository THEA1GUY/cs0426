# 🎓 Student Challenges & Tasks

Ready to level up your AI development skills? Here are some tasks you can try implementing in this codebase.

---

### 🟢 Level 1: UI & Personalization
1.  **Department Branding**: Change the theme color of the chat interface based on the selected department (e.g., Engineering = Blue, HR = Green).
2.  **Avatar Customization**: Allow users to upload their own avatar in the profile settings and display it in the chat bubble.
3.  **Typing Indicator**: Enhance the `isLoading` state to show a more natural "Bot is typing..." animation.

### 🟡 Level 2: Retrieval Logic (RAG)
1.  **Source Citations**: Modify the `Chat` API and UI to show *which* document chunks were used to generate the answer. (Hint: Return the `document_id` and `metadata` from the search results).
2.  **Multi-Document Search**: Increase the `match_count` in `rag.ts` and see how it affects the quality and "noise" of the AI's answers.
3.  **Threshold Tuning**: Experiment with the `match_threshold` in the PostgreSQL function. What happens if you set it to `0.8`? What about `0.1`?

### 🔴 Level 3: Advanced AI Features
1.  **Voice-to-Text Integration**: Complete the implementation of the `Transcription` API in the `chat/page.tsx` so users can actually speak to the bot.
2.  **Automatic Summarization**: When a user closes a chat, automatically generate a summary of the conversation and save it to the `conversations` table.
3.  **LLM Guardrails**: Implement a check to ensure the AI doesn't answer questions unrelated to company onboarding (e.g., "Tell me a joke" or "How do I fix my car?").

---

### 🚀 Bonus: Deployment & DevOps
- **Vercel Deployment**: Deploy this app to Vercel and set up your environment variables in the Vercel Dashboard.
- **Database Backups**: Set up a GitHub Action to back up your Supabase schema every time you push to `main`.
