import React from 'react';
import { Theme, Language } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '../Icons';

const GeneralSettings = () => {
    const { t, language, changeLanguage, theme, changeTheme } = useSettings();

    const themeOptions: { name: Theme, label: string, icon: React.ReactNode }[] = [
        { name: 'light', label: t('lightTheme'), icon: <SunIcon className="w-6 h-6 mb-1"/> },
        { name: 'dark', label: t('darkTheme'), icon: <MoonIcon className="w-6 h-6 mb-1"/> },
        { name: 'system', label: t('systemTheme'), icon: <ComputerDesktopIcon className="w-6 h-6 mb-1"/> }
    ];

    const languageOptions: { name: Language, label: string }[] = [
        { name: 'system', label: t('systemLanguage') },
        { name: 'ar', label: t('arabic') },
        { name: 'en', label: t('english') }
    ];

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('appearanceSettings')}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('appearanceSettingsDesc')}</p>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('theme')}</label>
                    <div className="mt-2 grid grid-cols-3 gap-3 max-w-xs">
                        {themeOptions.map(option => (
                             <button 
                                key={option.name}
                                onClick={() => changeTheme(option.name)} 
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 active:scale-95 ${theme === option.name 
                                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' 
                                    : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`
                                }
                             >
                                {option.icon}
                                <span className="text-sm font-medium">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('languageSettings')}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('languageSettingsDesc')}</p>
                <div className="mt-4">
                    <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('language')}</label>
                    <select 
                        id="language-select"
                        value={language}
                        onChange={(e) => changeLanguage(e.target.value as Language)}
                        className="mt-1 block w-full max-w-xs pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                    >
                        {languageOptions.map(option => (
                            <option key={option.name} value={option.name}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;