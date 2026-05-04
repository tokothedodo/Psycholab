import { SCIENTIFIC_CATEGORIES, type ScientificCategory } from './experimentTaxonomy';

export type ExperimentCategory = ScientificCategory;

export interface Experiment {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  category: ExperimentCategory;
  citation: string;
  year: number;
  duration: number; // in minutes
  trials: number;
  debriefKey: string;
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'muller-lyer-illusion',
    name: 'Müller-Lyer Illusion',
    nameKey: 'exp.mullerLyer.name',
    description: 'Measure misperception of line length induced by arrow-fin configurations',
    descriptionKey: 'exp.mullerLyer.desc',
    category: 'perception-psychophysics',
    citation: 'Müller-Lyer, 1889',
    year: 1889,
    duration: 3,
     trials: 20,
    debriefKey: 'exp.mullerLyer.debrief',
  },
  {
    id: 'stroop-color-word-interference-task',
    name: 'Stroop Color-Word Interference Task',
    nameKey: 'exp.stroop.name',
    description: 'Measure cognitive interference between automatic word reading and color naming',
    descriptionKey: 'exp.stroop.desc',
    category: 'attention',
    citation: 'Stroop, 1935',
    year: 1935,
    duration: 4,
    trials: 48,
    debriefKey: 'exp.stroop.debrief',
  },
  {
    id: 'digit-span-task',
    name: 'Digit Span Task',
    nameKey: 'exp.digitSpan.name',
    description: 'Measure working memory capacity via sequential digit recall',
    descriptionKey: 'exp.digitSpan.desc',
    category: 'memory-learning',
    citation: 'Jacobs, 1887',
    year: 1887,
    duration: 3,
    trials: 14,
    debriefKey: 'exp.digitSpan.debrief',
  },
  {
    id: 'ultimatum-game',
    name: 'Ultimatum Game',
    nameKey: 'exp.ultimatum.name',
    description: 'Measure fairness preferences and altruistic punishment in bargaining',
    descriptionKey: 'exp.ultimatum.desc',
    category: 'behavioral-economics',
    citation: 'Güth et al., 1982',
    year: 1982,
    duration: 3,
    trials: 10,
    debriefKey: 'exp.ultimatum.debrief',
  },
  {
    id: 'moral-machine-ingroup',
    name: 'Autonomous Vehicle Moral Machine',
    nameKey: 'exp.moralMachine.name',
    description: 'Investigate in-group bias in ethical decision-making for autonomous vehicles',
    descriptionKey: 'exp.moralMachine.desc',
    category: 'moral-psychology',
    citation: 'Awad et al., 2018',
    year: 2018,
    duration: 5,
    trials: 30,
    debriefKey: 'exp.moralMachine.debrief',
  },
];

export const CATEGORIES: { id: ExperimentCategory; nameKey: string; color: string }[] =
  SCIENTIFIC_CATEGORIES.map(c => ({ id: c.id, nameKey: c.nameKey, color: c.color }));

export const EXPERIMENTS_BY_CATEGORY = CATEGORIES.map(cat => ({
  ...cat,
  experiments: EXPERIMENTS.filter(e => e.category === cat.id),
}));

export const getExperimentById = (id: string): Experiment | undefined =>
  EXPERIMENTS.find(e => e.id === id);
