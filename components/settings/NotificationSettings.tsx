import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useNotifier } from '../../context/NotificationContext';
import { BellIcon } from '../Icons';
import { useToaster } from '../../context/ToastContext';

const NotificationSettings = () => {
    const { t, notificationDays, changeNotificationDays, direction } = useSettings();
    const { requestPermission, permission } = useNotifier();
    const { addToast } = useToaster();
    const [currentNotificationDays, setCurrentNotificationDays] = useState(notificationDays);

    useEffect(() => {
        setCurrentNotificationDays(notificationDays);
    }, [notificationDays]);

    const handleSave = () => {
        changeNotificationDays(currentNotificationDays);
        addToast(t('settingsSaved'), 'success');
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('notificationSettings')}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('notificationSettingsDesc')}</p>
                <div className="mt-6">
                    <label htmlFor="notification-days" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('alertBeforeExpiry')}</label>
                    <div className="flex items-center mt-2">
                        <input
                            type="number"
                            id="notification-days"
                            value={currentNotificationDays}
                            onChange={(e) => setCurrentNotificationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                        />
                        <span className={`${direction === 'rtl' ? 'mr-3' : 'ml-3'} text-slate-700 dark:text-slate-300`}>{t('days')}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                        <button 
                            onClick={handleSave} 
                            disabled={currentNotificationDays === notificationDays || !currentNotificationDays}
                            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {t('saveSettings')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('browserNotifications')}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('browserNotificationsDesc')}</p>
                 <div className="mt-4">
                    {permission === 'granted' && 
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300 rounded-r-lg">
                            {t('notificationsEnabled')}
                        </div>
                    }
                    {permission === 'denied' && 
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 rounded-r-lg">
                            {t('notificationsDenied')}
                        </div>
                    }
                    {permission === 'default' && 
                        <div className="flex items-center gap-4">
                            <button onClick={requestPermission} className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-all active:scale-95">
                                <BellIcon className="w-5 h-5"/>
                                {t('enableNotifications')}
                            </button>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('notificationsDefault')}</p>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;