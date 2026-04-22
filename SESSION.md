# Psycholab - Next Session Guide

## Project Overview

Psycholab is a React + TypeScript + Vite psychology experiment platform. It hosts various cognitive experiments (Müller-Lyer, Stroop, Digit Span, Reaction Time, etc.) that participants can complete online.

## Current State

- **Existing ReactionTimeExperiment**: Currently a placeholder showing a blue circle stimulus (src/experiments/ReactionTimeExperiment.tsx:1-172)
- **Framework**: React 19, TypeScript, Tailwind CSS, Vite
- **No server**: No Express server exists yet - needs to be created

## Asset Location

**Path**: `~/Downloads/assets/`

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

**Pedestrian Naming Convention**: `{race}_{gender}{number}.png`
- Race: `arab`, `black`, `indian`, `white`
- Gender: `man`, `woman`

## Task: Build RT Psychology Experiment

### Experimental Design

**Trials**: 30 total

**Trial Sequence**:
1. Show `+` fixation cross in center for 500ms
2. Clear cross, show road.jpg background
3. Overlay: doctor.png + ONE random pedestrian PNG
4. **Randomization**: Doctor on Left 50%, Right 50%

**User Input**:
- Press `A` to save the person on the Left
- Press `L` to save the person on the Right
- Press key via `keydown` event listener

**Measurement**:
- Use `performance.now()` to capture RT in milliseconds
- Start timer when images appear
- Stop timer on keypress

### Technical Requirements

- **Canvas**: Use HTML5 Canvas to render the scene
- **Scaling**: Anchor pedestrians to bottom of road lines (so they don't float)
- **Data Saving**: After trial 30, POST to Express server

### Data Structure

Each trial entry must include:
```typescript
{
  trial_index: number;           // 1-30
  pedestrian_race: string;      // "arab" | "black" | "indian" | "white"
  pedestrian_gender: string;   // "man" | "woman"
  position_of_doctor: string;   // "left" | "right"
  chosen_side: string;          // "left" | "right"
  reaction_time_ms: number;    // milliseconds
}
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