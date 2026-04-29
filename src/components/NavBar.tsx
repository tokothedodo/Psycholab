import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabase, signOut } from '../lib/supabase';
import type { Language } from '../types';
import type { User } from '@supabase/supabase-js';
import './NavBar.css';

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'EN', flag: '🇬🇧' },
    { code: 'ka', name: 'KA', flag: '🇬🇪' },
    { code: 'hy', name: 'HY', flag: '🇦🇲' },
    { code: 'az', name: 'AZ', flag: '🇦🇿' },
];

export function NavBar() {
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [langOpen, setLangOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Hide Navbar during experiments (preview or participant mode)
    const islanded = location.pathname.includes('/experiments/') || location.pathname.includes('/room/');
    if (islanded) return null;

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    // Truncate email if too long
    const displayEmail = user?.email && user.email.length > 20
        ? `${user.email.substring(0, 17)}...`
        : user?.email;

    return (
        <nav className="navbar">
            <div className="academic-container navbar-container">
                {/* Logo + Title */}
                <Link to="/" className="nav-logo">
                    PsychoLab<span className="nav-logo-dot">.</span>
                </Link>

                {/* Navigation Links */}
                <div className="nav-links">
                    {user ? (
                        <>
                            <Link to="/dashboard" className="nav-link">
                                {t('nav.dashboard') || 'Dashboard'}
                            </Link>
                            <Link to="/ai-assistant" className="nav-link">
                                🤖 AI
                            </Link>
                            <span className="nav-user-email" title={user.email}>
                                {displayEmail}
                            </span>
                            <button onClick={handleLogout} className="btn-outline">
                                {t('nav.logout') || 'Log out'}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link">
                                {t('nav.login')}
                            </Link>
                            <Link to="/signup" className="btn-primary">
                                {t('nav.signup') || 'Sign up'}
                            </Link>
                        </>
                    )}

                    {/* Language Selector */}
                    <div className="relative">
                        <div
                            onClick={() => setLangOpen(!langOpen)}
                            className="lang-selector-pill"
                        >
                            <span>{currentLang.flag}</span>
                            <span>{currentLang.name}</span>
                        </div>

                        {langOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                                <div className="lang-dropdown">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setLangOpen(false);
                                            }}
                                            className={`lang-option ${language === lang.code ? 'active' : ''}`}
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
