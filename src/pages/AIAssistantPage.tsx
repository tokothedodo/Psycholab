import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { AIAssistant } from '../components/AIAssistant';
import './AIAssistantPage.css';

export function AIAssistantPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="ai-page-layout">
      <header className="ai-page-header">
        <button onClick={() => navigate(-1)} className="btn-outline py-2 text-xs">
          ← {t('common.back') || 'Back'}
        </button>
        <h1 className="mb-0">AI Methodology Assistant</h1>
      </header>
      <main className="ai-page-content">
        <AIAssistant onClose={() => navigate(-1)} />
      </main>
    </div>
  );
}
