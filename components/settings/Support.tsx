import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { LifebuoyIcon } from '../Icons';

const Support = () => {
    const { t } = useSettings();

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div className="flex items-center gap-3">
                    <LifebuoyIcon className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('technicalSupport')}</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-4">{t('supportDescription')}</p>
                <div className="mt-4 pt-4 border-t dark:border-slate-700">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('contactEmail')}</p>
                    <a href="mailto:am01003322@gmail.com" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
                        am01003322@gmail.com
                    </a>
                </div>
            </div>

            <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-4">
                <p>{t('appCreator')}</p>
            </div>
        </div>
    );
};

export default Support;