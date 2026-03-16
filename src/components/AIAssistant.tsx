import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  currentExperiment: string | null;
  experimentConfig?: Record<string, Record<string, unknown>>;
  activeWarnings?: string[];
  dismissedWarnings?: string[];
  participantCount?: number;
  onClose?: () => void;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const SYSTEM_PROMPT = `You are a scientific research methodology assistant for PsychoLab.ge, a cognitive psychology research platform. You have deep knowledge of experimental psychology, psychophysics, and cognitive science. You are reviewing the researcher's experiment configuration in real time. Be specific, cite papers when relevant, and keep responses concise. Never be condescending — the researcher may know more than you about their specific study goals. When warning about a setting, always explain the specific methodological risk, not just that it is wrong.`;

const EXPERIMENT_GUIDANCE: Record<string, string> = {
  'muller-lyer-illusion': 'Müller-Lyer Illusion: A classic perceptual experiment testing line length perception influenced by arrow fins. Typically uses 20-40 trials. Citation: Müller, F. (1889).',
  'stroop-color-word-interference-task': 'Stroop Test: Measures cognitive interference by having participants name ink colors of color words. Validated studies use 48+ trials. Consider adding colorblind screening. Citation: Stroop, J.R. (1935).',
  'anchoring-and-adjustment-heuristic-task': 'Anchoring Bias: Tests numerical estimation with high/low anchors. Minimum 50 trials recommended. The correct answer for African UN countries is ~54%. Citation: Tversky & Kahneman (1974).',
  'ultimatum-game': 'Ultimatum Game: Economic decision-making experiment. Typically 8-12 trials with varying offer amounts. Measures fairness preferences. Citation: Güth et al. (1982).',
  'digit-span-task': 'Digit Span: Working memory test. Standard protocol includes 5-7 trials of increasing length. Maximum span is typically 7±2 items. Citation: Miller, G.A. (1956).',
  'ponzo-illusion': 'Ponzo Illusion: Depth perception test with converging lines. Usually 10-20 trials. Tests size constancy. Citation: Ponzo, M. (1912).',
  'simple-and-choice-reaction-time-task': 'Reaction Time: Measures simple and choice reaction time. Typically 40+ trials per condition. Remove outliers >2SD. Citation: Donders (1868).',
  'iowa-gambling-task': 'Iowa Gambling Task: Tests reward/punishment learning. 100 trials recommended to see learning curve. Citation: Bechara et al. (1994).',
  'color-category-perception-paradigm': 'Color Perception: Tests color category boundaries across languages. This is culturally significant for the Caucasus region. Citation: Berlin & Kay (1969).',
};

export function AIAssistant({
  currentExperiment,
  experimentConfig = {},
  activeWarnings = [],
  dismissedWarnings = [],
  participantCount = 0,
  onClose
}: AIAssistantProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-generate greeting when experiment changes
  useEffect(() => {
    if (currentExperiment) {
      const guidance = EXPERIMENT_GUIDANCE[currentExperiment];
      const expName = guidance ? guidance.split(':')[0] : currentExperiment;
      setMessages([{
        role: 'assistant',
        content: `You selected the ${expName}. Default settings are configured for a standard research session. Ask me anything about the methodology or variables.`,
      }]);
    } else {
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your AI research assistant. Select an experiment and I\'ll help you configure it with evidence-based recommendations.',
      }]);
    }
  }, [currentExperiment]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getContextInfo = () => {
    let context = 'Current experiment: ';
    if (!currentExperiment) {
      context += 'None selected yet. ';
    } else {
      context += EXPERIMENT_GUIDANCE[currentExperiment] || currentExperiment;
    }

    if (Object.keys(experimentConfig).length > 0) {
      context += '\n\nCurrent experiment configurations:\n';
      for (const [expId, config] of Object.entries(experimentConfig)) {
        context += `\n${expId}: ${JSON.stringify(config, null, 2)}\n`;
      }
    }

    if (activeWarnings.length > 0) {
      context += `\n\nActive warnings in your configuration:\n${activeWarnings.join('\n')}`;
    }

    if (dismissedWarnings.length > 0) {
      context += `\n\nDismissed warnings:\n${dismissedWarnings.join('\n')}`;
    }

    if (participantCount > 0) {
      context += `\n\n${participantCount} participant(s) currently in the room`;
    }

    return context;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (GEMINI_API_KEY) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${SYSTEM_PROMPT}\n\n${getContextInfo()}\n\nUser question: ${userMessage}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        const assistantResponse =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          'I apologize, but I couldn\'t generate a response. Please try again.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantResponse },
        ]);
      } else {
        const fallbackResponse = generateFallbackResponse(userMessage, experimentConfig, activeWarnings);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fallbackResponse },
        ]);
      }
    } catch {
      const fallbackResponse = generateFallbackResponse(userMessage, experimentConfig, activeWarnings);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackResponse },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (
    question: string,
    config: Record<string, Record<string, unknown>>,
    warnings: string[]
  ): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('trial') || lowerQuestion.includes('how many')) {
      return 'Based on validated protocols:\n- Stroop test: 48+ trials minimum\n- Anchoring: 50+ trials recommended\n- Müller-Lyer: 20-40 trials\n- Digit Span: 5-7 trials of increasing length\n- Reaction Time: 40+ trials per condition\n- IAT: 80+ trials total';
    }

    if (lowerQuestion.includes('isi') || lowerQuestion.includes('interval')) {
      return 'Inter-stimulus interval (ISI) recommendations:\n- Minimum 200ms to avoid anticipation effects\n- 500-1000ms is typical for many experiments\n- Longer ISI (2000ms+) may reduce fatigue but lengthens session';
    }

    if (lowerQuestion.includes('colorblind') || lowerQuestion.includes('accessibility')) {
      return 'Great question! For the Stroop test and other color experiments, consider adding a colorblind screening question.';
    }

    if (lowerQuestion.includes('debias') || lowerQuestion.includes('improve') || lowerQuestion.includes('suggest')) {
      let suggestions = 'Suggestions for improving your experiment:\n1. Add practice trials (5-10) before actual data collection';
      const hasLowTrials = Object.entries(config).some(
        ([, c]) => typeof c.trials === 'number' && (c.trials as number) < 10
      );
      if (hasLowTrials) {
        suggestions += '\n⚠️ Your trial count is below recommended minimums';
      }
      suggestions += '\n2. Include attention checks within trials\n3. Counterbalance order of conditions\n4. Record response times\n5. Remove outliers >2SD from analysis';
      return suggestions;
    }

    if (lowerQuestion.includes('warning') || lowerQuestion.includes('config')) {
      if (warnings.length > 0) {
        return `I see you have ${warnings.length} active warning(s):\n${warnings.map(w => `- ${w}`).join('\n')}\n\nThese warnings indicate settings that may reduce scientific validity.`;
      }
      return 'Your configuration looks good! No active warnings.';
    }

    if (lowerQuestion.includes('sample') || lowerQuestion.includes('participant')) {
      return 'For reliable statistical power, aim for:\n- Minimum 30 participants per condition\n- For effect sizes around d=0.5, you\'ll need ~64 participants\n- Consider power analysis before collecting data';
    }

    return 'I can help with:\n- Trial count recommendations\n- ISI and timing settings\n- Experiment design improvements\n- Accessibility considerations\n- Sample size guidance\n- Citation information\n\nWhat would you like to know more about?';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-navy-900 text-white rounded-t-lg">
        <h3 className="font-semibold text-sm">{t('ai.assistant.title')}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[250px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-2.5 rounded-lg ${message.role === 'user'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-800'
                }`}
            >
              <p className="whitespace-pre-wrap text-xs">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-2.5 rounded-lg">
              <p className="text-xs text-gray-500">{t('ai.assistant.thinking')}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ai.assistant.placeholder')}
            className="flex-1 p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
          >
            {t('ai.assistant.send')}
          </button>
        </div>
      </form>
    </div>
  );
}
