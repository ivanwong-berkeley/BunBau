# Technical Architecture: BunBau (資本寶)

The **BunBau** system is architected for seamless local development on macOS (Apple Silicon M-Series) and zero-friction production container deployment to **Google Cloud Platform (GCP)**, backed by **Firebase** for persistence, authentication, and secure asset storage.

## High-Level System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Layer (Next.js 15 / React 19)"]
        UI["Web UI (TailwindCSS v4 + Gen Z Theme)"]
        Charts["Chart.js / Data Table Toggles"]
        AuthClient["Firebase Auth Client (Google SSO)"]
        Store["Zustand / TanStack Query Store"]
    end

    subgraph Backend ["Backend API Service (FastAPI / Node Handlers)"]
        API["REST & Streaming Endpoints"]
        IngestService["Screenshot Vision Ingestion Engine"]
        ReconcileWorker["Account Deduplication & Versioning Engine"]
        MathEngine["P&L & Blended APY Calculator"]
        LLMOrchestrator["Swappable LLM Service Layer"]
    end

    subgraph Firebase ["Firebase & GCP Infrastructure"]
        FirebaseAuth["Firebase Authentication"]
        Firestore["Cloud Firestore (NoSQL Store)"]
        Storage["Firebase Cloud Storage (Encrypted Screenshots)"]
    end

    subgraph AIServices ["AI Services (Google Gemini & BYOK)"]
        GeminiFlash["Gemini 2.5 Flash (Vision Extraction)"]
        GeminiPro["Gemini 2.5 Pro (Strategy & Rebalance Reasoning)"]
        BYOK["Custom User Providers (OpenAI / Anthropic / Ollama)"]
    end

    subgraph Alerts ["Alerting & Notifications"]
        Scheduler["GCP Cloud Scheduler / Cron"]
        Dispatcher["Notification Dispatcher"]
        EmailService["SendGrid / Cloud Mail Engine"]
    end

    UI <--> API
    UI --> AuthClient
    AuthClient <--> FirebaseAuth
    API --> Storage
    API --> Firestore
    API --> IngestService
    IngestService --> GeminiFlash
    IngestService --> ReconcileWorker
    ReconcileWorker --> Firestore
    API --> LLMOrchestrator
    LLMOrchestrator <--> GeminiPro
    LLMOrchestrator <--> BYOK
    API --> MathEngine
    Scheduler --> Dispatcher
    Dispatcher --> Firestore
    Dispatcher --> EmailService