import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../types';

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'EN', flag: '🇬🇧' },
    { code: 'ka', name: 'KA', flag: '🇬🇪' },
    { code: 'hy', name: 'HY', flag: '🇦🇲' },
    { code: 'az', name: 'AZ', flag: '🇦🇿' },
];

export function NavBar() {
    const { language, setLanguage, t } = useLanguage();
    const [langOpen, setLangOpen] = useState(false);

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    return (
        <nav className="bg-primary text-white border-b border-primary/80">
            <div className="academic-container flex items-center justify-between h-14">
                {/* Logo + Title */}
                <Link to="/" className="flex items-center gap-2 text-white no-underline hover:opacity-90 transition-opacity">
                    <img src="/Psycholab.svg" alt="PsychoLab" className="h-7 w-auto" />
                    <span className="font-semibold text-lg tracking-tight">PsychoLab.ge</span>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-6">
                    <Link
                        to="/experiments"
                        className="text-white/80 hover:text-white text-sm no-underline transition-colors"
                    >
                        {t('nav.experiments')}
                    </Link>

                    <Link
                        to="/login"
                        className="text-white/80 hover:text-white text-sm no-underline transition-colors"
                    >
                        {t('nav.login')}
                    </Link>

                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setLangOpen(!langOpen)}
                            className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors bg-transparent border border-white/20 rounded px-2 py-1"
                        >
                            <span>{currentLang.flag}</span>
                            <span>{currentLang.name}</span>
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {langOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                                <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border border-border z-50 min-w-[120px]">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setLangOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface transition-colors ${language === lang.code ? 'text-primary font-medium' : 'text-text'
                                                }`}
                                        >
                                            <span>{lang.flag}</span>
                                            <span>{lang.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
