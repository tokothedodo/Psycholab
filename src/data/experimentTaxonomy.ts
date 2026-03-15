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

// ─── Perception and Psychophysics ───────────────────────────────────────────

export const EXPERIMENT_METADATA: ExperimentMetadata[] = [
    // PERCEPTION AND PSYCHOPHYSICS
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
        id: 'ponzo-illusion',
        fullName: 'Ponzo Illusion',
        abbreviation: 'Ponzo',
        category: 'perception-psychophysics',
        subcategory: 'Visual Illusions',
        primaryConstruct: 'Size constancy, linear perspective',
        theoreticalBasis: 'Perspective-based size scaling',
        originalCitation: 'Ponzo, M. (1911). Rapports entre quelques illusions visuelles de contraste angulaire et l\'appréciation de grandeur des astres à l\'horizon. Archives Italiennes de Biologie, 56, 327–329.',
        doiOrUrl: '',
        typicalEffect: 'The upper of two identical horizontal lines placed between converging lines appears longer due to linear perspective cues',
        culturalNotes: '',
        legacyId: 'ponzo',
    },
    {
        id: 'ebbinghaus-illusion',
        fullName: 'Ebbinghaus Illusion',
        abbreviation: 'Ebbinghaus',
        category: 'perception-psychophysics',
        subcategory: 'Visual Illusions',
        primaryConstruct: 'Relative size perception, contextual modulation',
        theoreticalBasis: 'Size contrast and assimilation effects',
        originalCitation: 'Ebbinghaus, H. (1902). Grundzüge der Psychologie. Leipzig: Veit.',
        doiOrUrl: '',
        typicalEffect: 'A circle surrounded by larger circles appears smaller than an identical circle surrounded by smaller circles',
        culturalNotes: '',
        legacyId: 'ebbinghaus',
    },
    {
        id: 'kanizsa-illusory-contour-paradigm',
        fullName: 'Kanizsa Illusory Contour Paradigm',
        abbreviation: 'Kanizsa',
        category: 'perception-psychophysics',
        subcategory: 'Perceptual Organization',
        primaryConstruct: 'Illusory contour formation, modal completion',
        theoreticalBasis: 'Gestalt principles of perceptual organization',
        originalCitation: 'Kanizsa, G. (1955). Margini quasi-percettivi in campi con stimolazione omogenea. Rivista di Psicologia, 49(1), 7–30.',
        doiOrUrl: '',
        typicalEffect: 'Participants perceive subjective contours and surfaces in the absence of physical edges when pac-man-like inducers are arranged appropriately',
        culturalNotes: '',
        legacyId: 'kanizsa',
    },
    {
        id: 'rubin-figure-ground-paradigm',
        fullName: 'Rubin Figure-Ground Paradigm',
        abbreviation: 'Rubin',
        category: 'perception-psychophysics',
        subcategory: 'Perceptual Organization',
        primaryConstruct: 'Figure-ground segregation, bistable perception',
        theoreticalBasis: 'Gestalt figure-ground organization',
        originalCitation: 'Rubin, E. (1915). Synsoplevede Figurer. Copenhagen: Gyldendalske Boghandel.',
        doiOrUrl: '',
        typicalEffect: 'Ambiguous images spontaneously alternate between two valid perceptual interpretations, reflecting competitive neural processing',
        culturalNotes: '',
        legacyId: 'rubin-vase',
    },
    {
        id: 'zollner-illusion',
        fullName: 'Zöllner Illusion',
        abbreviation: 'Zöllner',
        category: 'perception-psychophysics',
        subcategory: 'Visual Illusions',
        primaryConstruct: 'Orientation perception, angular distortion',
        theoreticalBasis: 'Lateral inhibition in orientation-selective neurons',
        originalCitation: 'Zöllner, F. (1860). Über eine neue Art von Pseudoskopie und ihre Beziehungen zu den von Plateau und Oppel beschriebenen Bewegungsphänomenen. Annalen der Physik, 186(7), 500–523.',
        doiOrUrl: 'https://doi.org/10.1002/andp.18601860712',
        typicalEffect: 'Parallel lines appear to converge or diverge when crossed by short diagonal lines at different angles',
        culturalNotes: '',
        legacyId: 'zollner',
    },
    {
        id: 'motion-aftereffect-paradigm',
        fullName: 'Motion Aftereffect Paradigm',
        abbreviation: 'MAE',
        category: 'perception-psychophysics',
        subcategory: 'Adaptation and Aftereffects',
        primaryConstruct: 'Neural adaptation, motion processing',
        theoreticalBasis: 'Ratio model of opponent motion detectors',
        originalCitation: 'Addams, R. (1834). An account of a peculiar optical phænomenon seen after having looked at a moving body. London and Edinburgh Philosophical Magazine and Journal of Science, 5(29), 373–374.',
        doiOrUrl: '',
        typicalEffect: 'After prolonged viewing of unidirectional motion, a stationary pattern appears to move in the opposite direction',
        culturalNotes: '',
        legacyId: 'motion-aftereffect',
    },
    {
        id: 'hollow-face-illusion',
        fullName: 'Hollow-Face Illusion',
        abbreviation: 'Hollow Face',
        category: 'perception-psychophysics',
        subcategory: 'Depth Perception',
        primaryConstruct: 'Depth inversion, top-down face processing',
        theoreticalBasis: 'Bayesian priors favoring convex face interpretation (Gregory, 1970)',
        originalCitation: 'Gregory, R. L. (1970). The Intelligent Eye. London: Weidenfeld & Nicolson.',
        doiOrUrl: '',
        typicalEffect: 'A concave (hollow) face mask is perceived as convex due to strong prior expectations about face geometry',
        culturalNotes: '',
        legacyId: 'hollow-face',
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
        id: 'difference-threshold-staircase-paradigm',
        fullName: 'Difference Threshold Staircase Paradigm',
        abbreviation: 'JND Staircase',
        category: 'perception-psychophysics',
        subcategory: 'Psychophysics',
        primaryConstruct: 'Just noticeable difference, Weber fraction',
        theoreticalBasis: 'Weber\'s law, adaptive psychophysical methods',
        originalCitation: 'Weber, E. H. (1834). De Pulsu, Resorptione, Auditu et Tactu: Annotationes Anatomicae et Physiologicae. Leipzig: Koehler.',
        doiOrUrl: '',
        typicalEffect: 'The just noticeable difference is a constant proportion of the stimulus magnitude, following Weber\'s law',
        culturalNotes: '',
        legacyId: 'jnd',
    },
    {
        id: 'mcgurk-effect',
        fullName: 'McGurk Effect',
        abbreviation: 'McGurk',
        category: 'perception-psychophysics',
        subcategory: 'Multisensory Integration',
        primaryConstruct: 'Audiovisual speech perception, cross-modal integration',
        theoreticalBasis: 'Multisensory integration in speech perception',
        originalCitation: 'McGurk, H., & MacDonald, J. (1976). Hearing lips and seeing voices. Nature, 264(5588), 746–748.',
        doiOrUrl: 'https://doi.org/10.1038/264746a0',
        typicalEffect: 'When auditory and visual speech information conflict, perception is altered — hearing "da" when seeing /ga/ lip movements paired with /ba/ audio',
        culturalNotes: '',
        legacyId: 'mcgurk',
    },
    {
        id: 'rubber-hand-illusion',
        fullName: 'Rubber Hand Illusion',
        abbreviation: 'RHI',
        category: 'perception-psychophysics',
        subcategory: 'Body Perception',
        primaryConstruct: 'Body ownership, multisensory integration, proprioception',
        theoreticalBasis: 'Multisensory integration of vision, touch, and proprioception',
        originalCitation: 'Botvinick, M., & Cohen, J. (1998). Rubber hands "feel" touch that eyes see. Nature, 391(6669), 756.',
        doiOrUrl: 'https://doi.org/10.1038/35784',
        typicalEffect: 'Synchronous stroking of a visible rubber hand and the hidden real hand causes participants to feel that the rubber hand is their own',
        culturalNotes: '',
        legacyId: 'rubber-hand',
    },
    {
        id: 'color-category-perception-paradigm',
        fullName: 'Color Category Perception Paradigm',
        abbreviation: 'Color Categories',
        category: 'perception-psychophysics',
        subcategory: 'Categorical Perception',
        primaryConstruct: 'Categorical color perception, linguistic relativity',
        theoreticalBasis: 'Sapir-Whorf hypothesis applied to color perception',
        originalCitation: 'Berlin, B., & Kay, P. (1969). Basic Color Terms: Their Universality and Evolution. Berkeley: University of California Press.',
        doiOrUrl: '',
        typicalEffect: 'Color discrimination is faster and more accurate across linguistic category boundaries than within categories',
        culturalNotes: 'Berlin & Kay (1969) documented cross-cultural universals and variations in basic color terms. Georgian language has separate basic terms for light blue (ცისფერი) and dark blue (ლურჯი), similar to Russian, potentially affecting categorical perception boundaries.',
        legacyId: 'color-perception',
    },

    // ATTENTION
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
        id: 'inattentional-blindness-paradigm',
        fullName: 'Inattentional Blindness Paradigm',
        abbreviation: 'Inattentional Blindness',
        category: 'attention',
        subcategory: 'Sustained Attention',
        primaryConstruct: 'Inattentional blindness, attentional resource allocation',
        theoreticalBasis: 'Perceptual load theory (Lavie, 1995)',
        originalCitation: 'Simons, D. J., & Chabris, C. F. (1999). Gorillas in our midst: Sustained inattentional blindness for dynamic events. Perception, 28(9), 1059–1074.',
        doiOrUrl: 'https://doi.org/10.1068/p281059',
        typicalEffect: 'When focused on a primary task, participants frequently fail to notice salient unexpected stimuli in the visual field',
        culturalNotes: '',
        legacyId: 'inattentional',
    },
    {
        id: 'change-detection-flicker-paradigm',
        fullName: 'Change Detection Flicker Paradigm',
        abbreviation: 'Change Blindness',
        category: 'attention',
        subcategory: 'Visual Attention',
        primaryConstruct: 'Change detection, visual representation, attention',
        theoreticalBasis: 'Sparse representation theory, visual transient disruption',
        originalCitation: 'Rensink, R. A., O\'Regan, J. K., & Clark, J. J. (1997). To see or not to see: The need for attention to perceive changes in scenes. Psychological Science, 8(5), 368–373.',
        doiOrUrl: 'https://doi.org/10.1111/j.1467-9280.1997.tb00427.x',
        typicalEffect: 'Large changes to visual scenes go undetected when a visual disruption (blank screen) masks the change transient',
        culturalNotes: '',
        legacyId: 'change-blindness',
    },

    // MEMORY AND LEARNING
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
        id: 'serial-position-effect-paradigm',
        fullName: 'Serial Position Effect Paradigm',
        abbreviation: 'Serial Position',
        category: 'memory-learning',
        subcategory: 'Free Recall',
        primaryConstruct: 'Primacy effect, recency effect, dual-store memory',
        theoreticalBasis: 'Atkinson-Shiffrin dual-store model',
        originalCitation: 'Murdock, B. B. (1962). The serial position effect of free recall. Journal of Experimental Psychology, 64(5), 482–488.',
        doiOrUrl: 'https://doi.org/10.1037/h0045106',
        typicalEffect: 'Items at the beginning (primacy) and end (recency) of a list are recalled better than middle items, producing a U-shaped curve',
        culturalNotes: '',
        legacyId: 'serial-position',
    },
    {
        id: 'sternberg-memory-scanning-task',
        fullName: 'Sternberg Memory Scanning Task',
        abbreviation: 'Sternberg Task',
        category: 'memory-learning',
        subcategory: 'Memory Search',
        primaryConstruct: 'Short-term memory scanning, serial exhaustive search',
        theoreticalBasis: 'Serial exhaustive scanning model',
        originalCitation: 'Sternberg, S. (1966). High-speed scanning in human memory. Science, 153(3736), 652–654.',
        doiOrUrl: 'https://doi.org/10.1126/science.153.3736.652',
        typicalEffect: 'Reaction time increases linearly with memory set size at ~38ms per item, consistent with serial exhaustive search',
        culturalNotes: '',
        legacyId: 'sternberg',
    },
    {
        id: 'deese-roediger-mcdermott-false-memory-paradigm',
        fullName: 'Deese-Roediger-McDermott (DRM) False Memory Paradigm',
        abbreviation: 'DRM Paradigm',
        category: 'memory-learning',
        subcategory: 'False Memory',
        primaryConstruct: 'False recognition, associative activation, source monitoring',
        theoreticalBasis: 'Activation-monitoring theory, fuzzy-trace theory',
        originalCitation: 'Roediger, H. L., & McDermott, K. B. (1995). Creating false memories: Remembering words not presented in lists. Journal of Experimental Psychology: Learning, Memory, and Cognition, 21(4), 803–814.',
        doiOrUrl: 'https://doi.org/10.1037/0278-7393.21.4.803',
        typicalEffect: 'Critical lure words are falsely recognized at rates comparable to actually studied words (50–80%)',
        culturalNotes: '',
        legacyId: 'drm',
    },

    // COGNITIVE PROCESSES
    {
        id: 'wason-selection-task',
        fullName: 'Wason Selection Task',
        abbreviation: 'Wason Task',
        category: 'cognitive-processes',
        subcategory: 'Logical Reasoning',
        primaryConstruct: 'Conditional reasoning, confirmation bias, falsification',
        theoreticalBasis: 'Deductive reasoning and hypothesis testing',
        originalCitation: 'Wason, P. C. (1968). Reasoning about a rule. Quarterly Journal of Experimental Psychology, 20(3), 273–281.',
        doiOrUrl: 'https://doi.org/10.1080/14640746808400161',
        typicalEffect: 'Fewer than 10% of participants correctly identify the falsifying case in abstract conditional reasoning, though performance improves dramatically with social contract content',
        culturalNotes: '',
        legacyId: 'wason',
    },
    {
        id: 'availability-heuristic-judgment-task',
        fullName: 'Availability Heuristic Judgment Task',
        abbreviation: 'Availability Heuristic',
        category: 'cognitive-processes',
        subcategory: 'Heuristics',
        primaryConstruct: 'Frequency judgment, ease of retrieval, availability bias',
        theoreticalBasis: 'Heuristics and biases program (Kahneman & Tversky)',
        originalCitation: 'Tversky, A., & Kahneman, D. (1973). Availability: A heuristic for judging frequency and probability. Cognitive Psychology, 5(2), 207–232.',
        doiOrUrl: 'https://doi.org/10.1016/0010-0285(73)90033-9',
        typicalEffect: 'Events that are easier to recall (more "available") are judged as more frequent, even when this is objectively incorrect',
        culturalNotes: '',
        legacyId: 'availability',
    },
    {
        id: 'hindsight-bias-paradigm',
        fullName: 'Hindsight Bias Paradigm',
        abbreviation: 'Hindsight Bias',
        category: 'cognitive-processes',
        subcategory: 'Metacognition',
        primaryConstruct: 'Hindsight bias, outcome knowledge, memory distortion',
        theoreticalBasis: 'Creeping determinism, sense-making processes',
        originalCitation: 'Fischhoff, B. (1975). Hindsight ≠ foresight: The effect of outcome knowledge on judgment under uncertainty. Journal of Experimental Psychology: Human Perception and Performance, 1(3), 288–299.',
        doiOrUrl: 'https://doi.org/10.1037/0096-1523.1.3.288',
        typicalEffect: 'After learning an outcome, participants believe they "knew it all along," shifting their recalled predictions toward the actual outcome',
        culturalNotes: '',
        legacyId: 'hindsight',
    },

    // JUDGMENT AND DECISION MAKING
    {
        id: 'anchoring-and-adjustment-heuristic-task',
        fullName: 'Anchoring and Adjustment Heuristic Task',
        abbreviation: 'Anchoring Task',
        category: 'judgment-decision-making',
        subcategory: 'Heuristics and Biases',
        primaryConstruct: 'Anchoring effect, insufficient adjustment, numeric estimation',
        theoreticalBasis: 'Anchoring-and-adjustment heuristic, selective accessibility model',
        originalCitation: 'Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124–1131.',
        doiOrUrl: 'https://doi.org/10.1126/science.185.4157.1124',
        typicalEffect: 'Numeric estimates are systematically biased toward an initially presented anchor value, even when the anchor is arbitrary',
        culturalNotes: '',
        legacyId: 'anchoring',
    },
    {
        id: 'attribute-framing-effect-paradigm',
        fullName: 'Attribute Framing Effect Paradigm',
        abbreviation: 'Framing Effect',
        category: 'judgment-decision-making',
        subcategory: 'Decision Under Risk',
        primaryConstruct: 'Loss aversion in risky choice, framing effect, reference dependence',
        theoreticalBasis: 'Prospect theory (Kahneman & Tversky, 1979)',
        originalCitation: 'Tversky, A., & Kahneman, D. (1981). The framing of decisions and the psychology of choice. Science, 211(4481), 453–458.',
        doiOrUrl: 'https://doi.org/10.1126/science.7455683',
        typicalEffect: 'People prefer a sure gain over a risky option with equal expected value, but prefer a risky option over a sure loss — reversing preferences based on frame',
        culturalNotes: '',
        legacyId: 'framing',
    },
    {
        id: 'conjunction-fallacy-paradigm',
        fullName: 'Conjunction Fallacy Paradigm',
        abbreviation: 'Linda Problem',
        category: 'judgment-decision-making',
        subcategory: 'Probability Judgment',
        primaryConstruct: 'Conjunction fallacy, representativeness heuristic',
        theoreticalBasis: 'Representativeness heuristic (Tversky & Kahneman)',
        originalCitation: 'Tversky, A., & Kahneman, D. (1983). Extensional versus intuitive reasoning: The conjunction fallacy in probability judgment. Psychological Review, 90(4), 293–315.',
        doiOrUrl: 'https://doi.org/10.1037/0033-295X.90.4.293',
        typicalEffect: 'Participants rate a conjunction (A and B) as more probable than a constituent (B alone) when A fits a stereotype, violating the conjunction rule',
        culturalNotes: 'Cross-cultural replications have shown variable conjunction fallacy rates, suggesting cultural differences in reliance on representativeness versus probabilistic reasoning.',
        legacyId: 'linda',
    },
    {
        id: 'sunk-cost-effect-paradigm',
        fullName: 'Sunk Cost Effect Paradigm',
        abbreviation: 'Sunk Cost',
        category: 'judgment-decision-making',
        subcategory: 'Decision Under Uncertainty',
        primaryConstruct: 'Sunk cost effect, escalation of commitment',
        theoreticalBasis: 'Mental accounting, waste avoidance',
        originalCitation: 'Arkes, H. R., & Blumer, C. (1985). The psychology of sunk cost. Organizational Behavior and Human Decision Processes, 35(1), 124–140.',
        doiOrUrl: 'https://doi.org/10.1016/0749-5978(85)90049-4',
        typicalEffect: 'Greater prior investment (time, money, effort) increases irrational commitment to a losing course of action',
        culturalNotes: '',
        legacyId: 'sunk-cost',
    },
    {
        id: 'loss-aversion-task',
        fullName: 'Loss Aversion Task',
        abbreviation: 'Loss Aversion',
        category: 'judgment-decision-making',
        subcategory: 'Risk and Valuation',
        primaryConstruct: 'Loss aversion, endowment effect, reference dependence',
        theoreticalBasis: 'Prospect theory (Kahneman & Tversky, 1979)',
        originalCitation: 'Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. Econometrica, 47(2), 263–291.',
        doiOrUrl: 'https://doi.org/10.2307/1914185',
        typicalEffect: 'Losses loom roughly twice as large as equivalent gains; participants require approximately 2:1 gain-to-loss ratio to accept symmetric gambles',
        culturalNotes: '',
        legacyId: 'loss-aversion',
    },
    {
        id: 'iowa-gambling-task',
        fullName: 'Iowa Gambling Task',
        abbreviation: 'IGT',
        category: 'judgment-decision-making',
        subcategory: 'Decision Under Ambiguity',
        primaryConstruct: 'Affective decision making, somatic markers, reward learning',
        theoreticalBasis: 'Somatic marker hypothesis (Damasio, 1994)',
        originalCitation: 'Bechara, A., Damasio, A. R., Damasio, H., & Anderson, S. W. (1994). Insensitivity to future consequences following damage to human prefrontal cortex. Cognition, 50(1–3), 7–15.',
        doiOrUrl: 'https://doi.org/10.1016/0010-0277(94)90018-3',
        typicalEffect: 'Healthy participants learn to prefer advantageous decks (C, D) over disadvantageous decks (A, B) within ~40–50 trials',
        culturalNotes: '',
        legacyId: 'iowa-gambling',
    },

    // BEHAVIORAL ECONOMICS AND GAME THEORY
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
    {
        id: 'dictator-game',
        fullName: 'Dictator Game',
        abbreviation: 'DG',
        category: 'behavioral-economics',
        subcategory: 'Resource Allocation',
        primaryConstruct: 'Altruism, social preferences, distributional fairness',
        theoreticalBasis: 'Models of other-regarding preferences',
        originalCitation: 'Kahneman, D., Knetsch, J. L., & Thaler, R. H. (1986). Fairness and the assumptions of economics. Journal of Business, 59(4), S285–S300.',
        doiOrUrl: 'https://doi.org/10.1086/296367',
        typicalEffect: 'Dictators typically give 20–30% of the endowment, revealing non-trivial prosocial preferences even without strategic incentives',
        culturalNotes: '',
        legacyId: 'dictator',
    },
    {
        id: 'investment-game',
        fullName: 'Investment Game',
        abbreviation: 'Trust Game',
        category: 'behavioral-economics',
        subcategory: 'Trust and Reciprocity',
        primaryConstruct: 'Trust, reciprocity, social risk',
        theoreticalBasis: 'Trust and trustworthiness in economic interactions',
        originalCitation: 'Berg, J., Dickhaut, J., & McCabe, K. (1995). Trust, reciprocity, and social history. Games and Economic Behavior, 10(1), 122–142.',
        doiOrUrl: 'https://doi.org/10.1006/game.1995.1027',
        typicalEffect: 'Investors send approximately 50% of their endowment; trustees return slightly more than was sent, sustaining partial reciprocity',
        culturalNotes: '',
        legacyId: 'trust',
    },
    {
        id: 'iterated-prisoners-dilemma',
        fullName: 'Iterated Prisoner\'s Dilemma',
        abbreviation: 'IPD',
        category: 'behavioral-economics',
        subcategory: 'Strategic Interaction',
        primaryConstruct: 'Cooperation, defection, reciprocal strategies',
        theoreticalBasis: 'Game theory, evolution of cooperation (Axelrod, 1984)',
        originalCitation: 'Rapoport, A., & Chammah, A. M. (1965). Prisoner\'s Dilemma. Ann Arbor: University of Michigan Press.',
        doiOrUrl: '',
        typicalEffect: 'Cooperative strategies (e.g., tit-for-tat) tend to outperform purely exploitative strategies over repeated interactions',
        culturalNotes: '',
        legacyId: 'prisoners-dilemma',
    },

    // SOCIAL COGNITION
    {
        id: 'implicit-association-test',
        fullName: 'Implicit Association Test',
        abbreviation: 'IAT',
        category: 'social-cognition',
        subcategory: 'Implicit Attitudes',
        primaryConstruct: 'Implicit attitudes, automatic associations, stereotyping',
        theoreticalBasis: 'Dual-process models of social cognition',
        originalCitation: 'Greenwald, A. G., McGhee, D. E., & Schwartz, J. L. K. (1998). Measuring individual differences in implicit cognition: The implicit association test. Journal of Personality and Social Psychology, 74(6), 1464–1480.',
        doiOrUrl: 'https://doi.org/10.1037/0022-3514.74.6.1464',
        typicalEffect: 'Participants respond faster when associated categories share a response key, revealing automatic associations (D-score)',
        culturalNotes: '',
        legacyId: 'iat',
    },
    {
        id: 'asch-conformity-paradigm',
        fullName: 'Asch Conformity Paradigm',
        abbreviation: 'Asch Paradigm',
        category: 'social-cognition',
        subcategory: 'Social Influence',
        primaryConstruct: 'Conformity, normative social influence, informational influence',
        theoreticalBasis: 'Normative vs. informational influence (Deutsch & Gerard, 1955)',
        originalCitation: 'Asch, S. E. (1951). Effects of group pressure upon the modification and distortion of judgments. In H. Guetzkow (Ed.), Groups, Leadership and Men (pp. 177–190). Pittsburgh: Carnegie Press.',
        doiOrUrl: '',
        typicalEffect: 'Approximately 37% of responses conform to an obviously incorrect unanimous majority across critical trials',
        culturalNotes: 'Bond & Smith (1996) meta-analysis found higher conformity rates in collectivist cultures compared to individualist cultures, with effect sizes varying significantly across 17 countries.',
        legacyId: 'asch',
    },
    {
        id: 'bystander-intervention-paradigm',
        fullName: 'Bystander Intervention Paradigm',
        abbreviation: 'Bystander Effect',
        category: 'social-cognition',
        subcategory: 'Prosocial Behavior',
        primaryConstruct: 'Diffusion of responsibility, pluralistic ignorance',
        theoreticalBasis: 'Diffusion of responsibility model (Darley & Latané)',
        originalCitation: 'Darley, J. M., & Latané, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. Journal of Personality and Social Psychology, 8(4), 377–383.',
        doiOrUrl: 'https://doi.org/10.1037/h0025589',
        typicalEffect: 'Helping rates decrease as the number of bystanders increases, due to diffusion of responsibility and pluralistic ignorance',
        culturalNotes: '',
        legacyId: 'bystander',
    },
    {
        id: 'false-consensus-effect-paradigm',
        fullName: 'False Consensus Effect Paradigm',
        abbreviation: 'False Consensus',
        category: 'social-cognition',
        subcategory: 'Social Judgment',
        primaryConstruct: 'False consensus, projection, social perception',
        theoreticalBasis: 'Anchoring and selective exposure',
        originalCitation: 'Ross, L., Greene, D., & House, P. (1977). The false consensus effect: An egocentric bias in social perception and attribution processes. Journal of Experimental Social Psychology, 13(3), 279–301.',
        doiOrUrl: 'https://doi.org/10.1016/0022-1031(77)90049-X',
        typicalEffect: 'Participants overestimate the proportion of others who share their own attitudes, beliefs, and behavioral choices',
        culturalNotes: '',
        legacyId: 'false-consensus',
    },

    // MORAL PSYCHOLOGY
    {
        id: 'trolley-problem-paradigm',
        fullName: 'Trolley Problem Paradigm',
        abbreviation: 'Trolley Problem',
        category: 'moral-psychology',
        subcategory: 'Moral Judgment',
        primaryConstruct: 'Utilitarian vs. deontological judgment, moral emotions',
        theoreticalBasis: 'Dual-process theory of moral judgment (Greene et al., 2001)',
        originalCitation: 'Foot, P. (1967). The problem of abortion and the doctrine of double effect. Oxford Review, 5, 5–15. Thomson, J. J. (1985). The trolley problem. Yale Law Journal, 94(6), 1395–1415.',
        doiOrUrl: '',
        typicalEffect: 'Most people approve of diverting a trolley to save five but disapprove of pushing someone onto the tracks, revealing tension between utilitarian outcomes and deontological constraints',
        culturalNotes: '',
        legacyId: 'trolley',
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
