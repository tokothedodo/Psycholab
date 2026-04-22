import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './AIAssistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  canApply?: boolean;
  modification?: string;
}

interface AIAssistantProps {
  currentExperiment?: string | null;
  experimentConfig?: Record<string, Record<string, unknown>>;
  activeWarnings?: string[];
  dismissedWarnings?: string[];
  participantCount?: number;
  roomId?: string;
  onClose?: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vfobqpnjzsytdalgviqk.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  roomId: propRoomId,
  onClose
}: AIAssistantProps) {
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
      if (SUPABASE_ANON_KEY) {
        const context = {
          experimentConfig,
          activeWarnings,
          dismissedWarnings,
          participantCount,
          roomId: propRoomId,
        };

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/ai-assistant`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              message: userMessage,
              context,
            }),
          }
        );

        const data = await response.json();
        let assistantResponse = data.reply || data.error || 'I apologize, but I couldn\'t generate a response. Please try again.';

        const modMatch = assistantResponse.match(/\[MODIFY\]\s*(\{[^}]+\})\s*\[\/MODIFY\]/);
        if (modMatch) {
          try {
            const mod = JSON.parse(modMatch[1]);
            assistantResponse = mod.reason + '\n\n[FIXED: ' + mod.field + ' = ' + mod.value + ']';
          } catch {}
        }

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantResponse, ...(modMatch ? { canApply: true, modification: modMatch[1] } : {}) },
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

  const handleApplyModification = async (modJson: string) => {
    try {
      const mod = JSON.parse(modJson);
      if (!propRoomId) {
        alert('No room loaded');
        return;
      }
      const { error } = await supabase
        .from('rooms')
        .update({ config: { [mod.field]: mod.value } })
        .eq('id', propRoomId);
      if (error) throw error;
      alert(`Applied: ${mod.field} = ${mod.value}`);
    } catch (err) {
      alert('Failed to apply: ' + err);
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
    <div className="ai-container h-full">
      <div className="ai-header">
        <h3>AI Methodology Assistant</h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        )}
      </div>

      <div className="ai-messages h-full max-h-[300px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`ai-msg ${message.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.canApply && message.modification && (
              <button
                type="button"
                className="ai-apply-btn"
                onClick={() => handleApplyModification(message.modification)}
              >
                Apply Change
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="ai-msg ai-msg-bot">
            <p className="ai-thinking">Consulting research database...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="ai-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about trials, ISI, or citations..."
          className="ai-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="ai-send"
        >
          Send
        </button>
      </form>
    </div>
  );
}
