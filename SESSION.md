# Psycholab - Next Session Guide

## Project Overview

Psycholab is a React + TypeScript + Vite psychology experiment platform. It hosts various cognitive experiments (Müller-Lyer, Stroop, Digit Span, Ultimatum Game) that participants can complete online.

## Current State

- **Framework**: React 19, TypeScript, Tailwind CSS, Vite
- **Active Experiments**: Müller-Lyer Illusion, Stroop Task, Digit Span Task, Ultimatum Game
- **Deleted**: Reaction Time experiment has been fully removed from the codebase

## Asset Location

**Path**: `public/` directory

**Available Images**:
| Filename | Type |
|----------|------|
| `doctor.png` | Doctor (savior figure) |
| `road.png` | Background |
| `arab_man1.png`, `arab_woman1.png` | Arab pedestrians |
| `black_man1.png`, `black_woman1.png` | Black pedestrians |
| `indian_man1.png`, `indian_woman1.png` | Indian pedestrians |
| `white_man1.png`, `white_woman1.png` | White pedestrians |
| `black_constructionwoman.png` | Additional black woman |

## Scripts

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # Lint code
```

The Express server should save to `experiment_results.json`.

### UI Style

**Zero distractions** - No buttons or text during trials. Only the images.

## Files to Work With

1. **Main experiment file**: `src/experiments/ReactionTimeExperiment.tsx`
   - Replace existing placeholder code
   - Import PNGs from `~/Downloads/assets/`
   - Handle keyboard A/L input
   - Canvas rendering logic

2. **New server file**: Needs creation (e.g., `server.js`)
   - Express server
   - POST endpoint `/api/results`
   - Write to `experiment_results.json`

3. **Experiment wrapper**: `src/experiments/ExperimentWrapper.tsx` (readonly - understand interface)

4. **Experiment data**: `src/data/experiments.ts` - current experiments registry

## Questions to Clarify Before Building

1. How to load assets (import from ~/Downloads/assets or copy to src/assets)?
2. What's the exact Express endpoint/port?
3. Canvas size - fullscreen or fixed dimensions?
4. What anchoring for pedestrians on road.png?

## Scripts

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # Lint code
```