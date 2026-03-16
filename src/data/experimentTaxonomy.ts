/**
 * Experiment Taxonomy — Single Source of Truth
 * 
 * All experiment metadata, categories, and naming follows standard
 * experimental psychology taxonomy used in peer-reviewed literature.
 * 
 * @module experimentTaxonomy
 */

// ─── Category Definitions ───────────────────────────────────────────────────

export type ScientificCategory =
    | 'perception-psychophysics'
    | 'attention'
    | 'memory-learning'
    | 'cognitive-processes'
    | 'judgment-decision-making'
    | 'behavioral-economics'
    | 'social-cognition'
    | 'moral-psychology';

export interface CategoryDefinition {
    id: ScientificCategory;
    name: string;
    nameKey: string;
    theoreticalBasis: string;
    journalOfReference: string;
    color: string;
}

export const SCIENTIFIC_CATEGORIES: CategoryDefinition[] = [
    {
        id: 'perception-psychophysics',
        name: 'Perception and Psychophysics',
        nameKey: 'cat.perceptionPsychophysics',
        theoreticalBasis: 'Fechner, Weber, Gibson, Helmholtz',
        journalOfReference: 'Perception & Psychophysics',
        color: 'blue',
    },
    {
        id: 'attention',
        name: 'Attention',
        nameKey: 'cat.attention',
        theoreticalBasis: 'Broadbent, Treisman, Posner',
        journalOfReference: 'Journal of Experimental Psychology: Human Perception and Performance',
        color: 'amber',
    },
    {
        id: 'memory-learning',
        name: 'Memory and Learning',
        nameKey: 'cat.memoryLearning',
        theoreticalBasis: 'Ebbinghaus, Baddeley, Tulving, Roediger',
        journalOfReference: 'Journal of Memory and Language',
        color: 'purple',
    },
    {
        id: 'cognitive-processes',
        name: 'Cognitive Processes',
        nameKey: 'cat.cognitiveProcesses',
        theoreticalBasis: 'Kahneman, Posner, Logan',
        journalOfReference: 'Cognition',
        color: 'teal',
    },
    {
        id: 'judgment-decision-making',
        name: 'Judgment and Decision Making',
        nameKey: 'cat.judgmentDecisionMaking',
        theoreticalBasis: 'Tversky, Kahneman, Gigerenzer',
        journalOfReference: 'Journal of Behavioral Decision Making',
        color: 'orange',
    },
    {
        id: 'behavioral-economics',
        name: 'Behavioral Economics and Game Theory',
        nameKey: 'cat.behavioralEconomics',
        theoreticalBasis: 'Güth, Berg, Camerer, Fehr',
        journalOfReference: 'Games and Economic Behavior',
        color: 'green',
    },
    {
        id: 'social-cognition',
        name: 'Social Cognition',
        nameKey: 'cat.socialCognition',
        theoreticalBasis: 'Greenwald, Asch, Latané',
        journalOfReference: 'Journal of Personality and Social Psychology',
        color: 'pink',
    },
    {
        id: 'moral-psychology',
        name: 'Moral Psychology',
        nameKey: 'cat.moralPsychology',
        theoreticalBasis: 'Haidt, Greene, Foot, Thomson',
        journalOfReference: 'Cognition, Psychological Science',
        color: 'rose',
    },
];

// ─── Experiment Metadata ────────────────────────────────────────────────────

export interface ExperimentMetadata {
    id: string;
    fullName: string;
    abbreviation: string;
    category: ScientificCategory;
    subcategory: string;
    primaryConstruct: string;
    theoreticalBasis: string;
    originalCitation: string;
    doiOrUrl: string;
    typicalEffect: string;
    culturalNotes: string;
    /** Maps to the old experiment ID for backward compatibility */
    legacyId: string;
}

export const EXPERIMENT_METADATA: ExperimentMetadata[] = [
    {
        id: 'muller-lyer-illusion',
        fullName: 'Müller-Lyer Illusion',
        abbreviation: 'Müller-Lyer',
        category: 'perception-psychophysics',
        subcategory: 'Visual Illusions',
        primaryConstruct: 'Size constancy, depth cue misapplication',
        theoreticalBasis: 'Misapplied constancy scaling (Gregory, 1963)',
        originalCitation: 'Müller-Lyer, F. C. (1889). Optische Urteilstäuschungen. Archiv für Anatomie und Physiologie, Physiologische Abteilung, 2, 263–270.',
        doiOrUrl: '',
        typicalEffect: 'Lines with outward-pointing fins are perceived as longer than lines with inward-pointing fins of equal length',
        culturalNotes: 'Segall, Campbell, & Herskovits (1966) found reduced susceptibility in non-carpentered environments, supporting the carpentered-world hypothesis that exposure to rectangular architecture influences illusion magnitude.',
        legacyId: 'muller-lyer',
    },
    {
        id: 'simple-and-choice-reaction-time-task',
        fullName: 'Simple and Choice Reaction Time Task',
        abbreviation: 'RT Task',
        category: 'perception-psychophysics',
        subcategory: 'Psychophysics',
        primaryConstruct: 'Processing speed, response selection',
        theoreticalBasis: 'Donders\' subtraction method, stage theory of information processing',
        originalCitation: 'Donders, F. C. (1868/1969). On the speed of mental processes. Acta Psychologica, 30, 412–431.',
        doiOrUrl: 'https://doi.org/10.1016/0001-6918(69)90065-1',
        typicalEffect: 'Choice reaction time is systematically longer than simple reaction time, reflecting additional decision stages',
        culturalNotes: '',
        legacyId: 'reaction-time',
    },
    {
        id: 'stroop-color-word-interference-task',
        fullName: 'Stroop Color-Word Interference Task',
        abbreviation: 'Stroop Task',
        category: 'attention',
        subcategory: 'Cognitive Control',
        primaryConstruct: 'Response inhibition, selective attention, automaticity',
        theoreticalBasis: 'Dual-process theory of automaticity',
        originalCitation: 'Stroop, J. R. (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology, 18(6), 643–662.',
        doiOrUrl: 'https://doi.org/10.1037/h0054651',
        typicalEffect: 'Participants are slower and less accurate naming ink colors of incongruent color words compared to congruent ones',
        culturalNotes: '',
        legacyId: 'stroop',
    },
    {
        id: 'digit-span-task',
        fullName: 'Digit Span Task',
        abbreviation: 'Digit Span',
        category: 'memory-learning',
        subcategory: 'Working Memory',
        primaryConstruct: 'Working memory capacity, phonological loop',
        theoreticalBasis: 'Baddeley\'s working memory model',
        originalCitation: 'Jacobs, J. (1887). Experiments on "Prehension." Mind, 12(45), 75–79.',
        doiOrUrl: 'https://doi.org/10.1093/mind/os-12.45.75',
        typicalEffect: 'Typical adults can recall 7 ± 2 digits in sequence; capacity is limited by the phonological loop',
        culturalNotes: '',
        legacyId: 'digit-span',
    },
    {
        id: 'ultimatum-game',
        fullName: 'Ultimatum Game',
        abbreviation: 'UG',
        category: 'behavioral-economics',
        subcategory: 'Bargaining',
        primaryConstruct: 'Fairness preferences, inequity aversion, altruistic punishment',
        theoreticalBasis: 'Inequity aversion (Fehr & Schmidt, 1999)',
        originalCitation: 'Güth, W., Schmittberger, R., & Schwarze, B. (1982). An experimental analysis of ultimatum bargaining. Journal of Economic Behavior & Organization, 3(4), 367–388.',
        doiOrUrl: 'https://doi.org/10.1016/0167-2681(82)90011-7',
        typicalEffect: 'Proposers typically offer 40–50% of the endowment; offers below 20% are frequently rejected by responders',
        culturalNotes: 'Henrich et al. (2001) found substantial cross-cultural variation in offers and rejection thresholds across 15 small-scale societies, challenging the universality of fairness norms.',
        legacyId: 'ultimatum',
    },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

/** Get metadata for an experiment by its scientific ID */
export const getMetadataById = (id: string): ExperimentMetadata | undefined =>
    EXPERIMENT_METADATA.find(m => m.id === id);

/** Get metadata for an experiment by its legacy ID */
export const getMetadataByLegacyId = (legacyId: string): ExperimentMetadata | undefined =>
    EXPERIMENT_METADATA.find(m => m.legacyId === legacyId);

/** Get a category definition by ID */
export const getCategoryById = (id: ScientificCategory): CategoryDefinition | undefined =>
    SCIENTIFIC_CATEGORIES.find(c => c.id === id);

/** Map from legacy ID → new scientific ID */
export const LEGACY_ID_MAP: Record<string, string> = Object.fromEntries(
    EXPERIMENT_METADATA.map(m => [m.legacyId, m.id])
);

/** Map from new scientific ID → legacy ID */
export const REVERSE_ID_MAP: Record<string, string> = Object.fromEntries(
    EXPERIMENT_METADATA.map(m => [m.id, m.legacyId])
);
