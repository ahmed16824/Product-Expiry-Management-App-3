import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Theme, Language } from '../types';

type Direction = 'rtl' | 'ltr';

interface SettingsContextType {
  language: Language;
  direction: Direction;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  changeLanguage: (lang: Language) => void;
  theme: Theme;
  changeTheme: (theme: Theme) => void;
  notificationDays: number;
  changeNotificationDays: (days: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

// FIX: To resolve a potential type inference issue causing the 'missing children' error, props are now defined in a dedicated interface.
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || 'system'
  );
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'system'
  );
  const [notificationDays, setNotificationDays] = useState<number>(
    () => parseInt(localStorage.getItem('notificationDays') || '7', 10)
  );
  
  // FIX: Updated the type for `translations` to `Record<string, Record<string, string>>` to ensure type safety and resolve issues where the `t` function's return type was inferred incorrectly.
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [effectiveLang, setEffectiveLang] = useState('ar');
  const [direction, setDirection] = useState<Direction>('rtl');

  useEffect(() => {
    const loadTranslations = async () => {
        try {
            const [arRes, enRes] = await Promise.all([
                fetch('./locales/ar.json'),
                fetch('./locales/en.json')
            ]);
            if (!arRes.ok || !enRes.ok) {
              throw new Error('Failed to fetch translation files');
            }
            // FIX: Explicitly type parsed JSON to ensure type safety for translations.
            const arJson: Record<string, string> = await arRes.json();
            const enJson: Record<string, string> = await enRes.json();
            setTranslations({ ar: arJson, en: enJson });
        } catch (error) {
            console.error("Failed to load translation files:", error);
        }
    };
    loadTranslations();
  }, []);


  useEffect(() => {
    // Language effect
    if (Object.keys(translations).length === 0) return;
    
    let langToUse: 'ar' | 'en';
    if (language === 'system') {
      langToUse = navigator.language.startsWith('ar') ? 'ar' : 'en';
    } else {
        langToUse = language as 'ar' | 'en';
    }

    setEffectiveLang(langToUse);
    const newDirection = langToUse === 'ar' ? 'rtl' : 'ltr';
    setDirection(newDirection);
    
    document.documentElement.lang = langToUse;
    document.documentElement.dir = newDirection;
    
    if (translations[langToUse]) {
      document.title = translations[langToUse]['appName'] || 'Expiry Management';
    }

  }, [language, translations]);

  useEffect(() => {
    // Theme effect
    const applyTheme = (themeValue: Theme) => {
        if (
            themeValue === 'dark' ||
            (themeValue === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme(theme);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);

  }, [theme]);

  const changeLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguage(lang);
  };
  
  const changeTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  const changeNotificationDays = (days: number) => {
    if (days > 0) {
      localStorage.setItem('notificationDays', String(days));
      setNotificationDays(days);
    }
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translation = translations[effectiveLang]?.[key] || key;
    if (replacements) {
        Object.keys(replacements).forEach((placeholder) => {
            translation = translation.replace(`{${placeholder}}`, String(replacements[placeholder]));
        });
    }
    return translation;
  }, [effectiveLang, translations]);

  const value = {
    language,
    direction,
    t,
    changeLanguage,
    theme,
    changeTheme,
    notificationDays,
    changeNotificationDays,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};