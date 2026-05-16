# 🤖 AI Employee Onboarding Assistant

A high-performance, 24/7 AI-powered onboarding system built with **Next.js**, **Supabase**, and **Retrieval-Augmented Generation (RAG)**.

This repository is designed as an educational resource for students learning to build modern AI software. It demonstrates how to integrate vector databases, LLMs, and voice processing into a cohesive business application.

---

## 🏗️ The Architecture: How it Works

The system follows a modern **AI-First Architecture**:

1.  **Retrieval-Augmented Generation (RAG)**: Instead of just asking an LLM to "guess" company policies, we store actual documents (like the Employee Handbook) in a PostgreSQL database using `pgvector`.
2.  **Native Embeddings**: We use the `gte-small` model running natively on **Supabase Edge Functions**. This converts text into mathematical vectors (384 dimensions) that represent the *semantic meaning* of the text.
3.  **The Brain**: We use **Llama 3.3 (70B)** via **OpenRouter** to process the retrieved context and generate professional, accurate responses.
4.  **Multimodal Support**: Integrated with **Groq Whisper** for near-instant audio-to-text transcription, allowing employees to ask questions via voice.

---

## 🚀 Key Features

- **🔐 Role-Based Portals**: Separate interfaces for **New Hires** (Support) and **Admins** (Knowledge Management).
- **🧠 Semantic Search**: The assistant doesn't just look for keywords; it understands the intent behind employee questions.
- **📁 Automated Indexing**: Admins can paste new documents which are automatically chunked, embedded, and indexed for the AI.
- **🚩 Human Escalation**: If the AI is uncertain, it summarizes the conversation and creates a ticket for a human Department Head.
- **✨ Premium UI**: Built with a sleek dark-mode aesthetic using Glassmorphism and modern CSS.

---

## 🛠️ Technical Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Lucide Icons.
- **Styling**: Vanilla CSS with custom Design Tokens.
- **Backend/DB**: [Supabase](https://supabase.com/) (PostgreSQL + `pgvector`).
- **AI Orchestration**: [Vercel AI SDK](https://sdk.vercel.ai/).
- **LLM Provider**: [OpenRouter](https://openrouter.ai/) (Llama 3.3).
- **Voice API**: [Groq Whisper](https://groq.com/).

---

## 📖 Student Guide: Deep Dives

### 1. Vector Search (The "R" in RAG)
Check out `src/lib/rag.ts`. You'll see how we take a user's question, turn it into a vector, and then use a PostgreSQL function (`match_document_chunks`) to find the most similar pieces of information in our database.

### 2. Native Edge Computing
Look at `supabase/functions/embed/index.ts`. This shows how to run AI models (like GTE) on the "Edge"—meaning the computation happens right next to the data, making it incredibly fast and cost-effective.

### 3. Streaming AI Responses
In `src/app/api/chat/route.ts`, we implement streaming. This allows the AI to send characters to the user as they are generated, providing a much smoother user experience than waiting for the full response.

---

## 🚦 Getting Started

1.  **Clone the Repo**: `git clone <repo-url>`
2.  **Install Dependencies**: `npm install`
3.  **Configure Environment**: Copy `.env.local.example` to `.env.local` and add your keys.
4.  **Run Locally**: `npm run dev`
5.  **Setup Database**: Run the SQL script in `supabase/migrations` via your Supabase SQL Editor.

---

## 🤝 Contribution for Students
If you're using this to learn:
- Try adding a new department role (e.g., "Finance").
- Try changing the embedding model to OpenAI's `text-embedding-3-small`.
- Try implementing a "Source Citation" feature where the AI links to the specific document it used for the answer.

---

*Built with ❤️ for the next generation of AI Engineers.*
