# PsychoLab

A modern research platform for conducting cognitive psychology experiments online. PsychoLab enables researchers to create virtual experiment rooms and collect data from participants remotely using scientifically-validated cognitive tasks.

## Features

- **Multiple Experiment Types**: Müller-Lyer Illusion, Reaction Time, Stroop Task, Digit Span, and Ultimatum Game
- **Room-Based Sessions**: Generate unique 6-digit codes for participants to join
- **Researcher Dashboard**: Create, manage, and monitor experiment rooms in real-time
- **Data Collection**: Automated result tracking and CSV export
- **Multi-Language Support**: English, Georgian, Armenian, and Azerbaijani
- **AI Assistant**: Integrated Gemini-powered help for participants

## Experiments

| Experiment | Description |
|------------|-------------|
| **Müller-Lyer Illusion** | Measures perceptual misjudgment of line segments |
| **Reaction Time Task** | Assesses simple and choice reaction times (Donders, 1868) |
| **Stroop Task** | Evaluates cognitive interference and selective attention |
| **Digit Span Task** | Measures working memory capacity |
| **Ultimatum Game** | Examines fairness preferences in economic bargaining |

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router DOM 7 |
| Backend | Supabase (PostgreSQL + Auth) |
| API Server | Express 5 |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/psycholab.git
cd psycholab

# Install dependencies
npm install
```

### Configuration

Create a `.env` file based on `.env.example`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API (optional - for AI Assistant)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration file in the Supabase SQL Editor:
   ```bash
   # Copy the contents of supabase-migration.sql and execute in Supabase SQL Editor
   ```

### Running the Application

```bash
# Start the development server (Vite)
npm run dev

# In a separate terminal, start the Express server for saving results
npm run server
```

The app will be available at `http://localhost:5173` and the API server at `http://localhost:3001`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
| `npm run server` | Start Express server |

## Project Structure

```
src/
├── components/          # Reusable UI components (NavBar, QRCode, AIAssistant, etc.)
├── pages/               # Route pages (Dashboard, RoomBuilder, Experiment, etc.)
├── experiments/         # Individual experiment implementations
│   ├── config/          # Experiment configuration
│   ├── ExperimentWrapper.tsx
│   ├── MullerLyerExperiment.tsx
│   ├── ReactionTimeExperiment.tsx
│   ├── StroopExperiment.tsx
│   ├── DigitSpanExperiment.tsx
│   └── UltimatumExperiment.tsx
├── hooks/               # Custom React hooks (useExperiment, useResults, useTimer)
├── context/             # React context (LanguageContext for i18n)
├── data/                # Experiment registry and taxonomy
├── i18n/                # Translations for supported languages
├── lib/                 # Utilities (Supabase client, random helpers)
└── types/               # TypeScript type definitions

server.js                # Express server for experiment results API
supabase-migration.sql   # Database schema with RLS policies
```

## Usage

### For Researchers

1. Sign up/Login to your account
2. Navigate to the Dashboard
3. Create a new experiment room with your desired configuration
4. Share the 6-digit room code or QR code with participants
5. Monitor real-time participant counts
6. Export results as CSV when complete

### For Participants

1. Enter the room code or scan the QR code
2. Complete the demographic information form
3. Follow the experiment instructions
4. Submit your results

## API Endpoints

The Express server exposes the following endpoints for saving experiment results:

- `POST /api/results` - Save experiment results
- `GET /api/results` - Retrieve experiment results

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_GEMINI_API_KEY` | No | Gemini API key for AI Assistant |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.