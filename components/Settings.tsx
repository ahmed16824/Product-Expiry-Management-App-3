

import React, { useState, useMemo } from 'react';
import { ScannableProduct, User, Role } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { SettingsIcon, BellIcon, DatabaseIcon, LifebuoyIcon, UsersIcon, LogoutIcon, ChevronLeftIcon } from './Icons';
import GeneralSettings from './settings/GeneralSettings';
import NotificationSettings from './settings/NotificationSettings';
import DataManagement from './settings/DataManagement';
import Support from './settings/Support';
import UserManagement from './settings/UserManagement';

interface SettingsProps {
    scannableProducts: ScannableProduct[];
    onSaveScannableProduct: (product: ScannableProduct) => void;
    onDeleteScannableProduct: (productCode: string) => void;
    onImportScannableProducts: (products: ScannableProduct[]) => void;
    onDeleteCompanyProducts: (companyName: string) => void;
    users: User[];
    onSaveUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
}

type SettingsSection = 'general' | 'notifications' | 'data' | 'support' | 'users';

const Settings: React.FC<SettingsProps> = (props) => {
    const { t, direction } = useSettings();
    const { currentUser, logout } = useAuth();
    const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);

    const navItems = useMemo(() => {
        const allItems = [
            { id: 'users', label: t('userManagement'), description: t('userManagementDesc'), icon: <UsersIcon className="w-6 h-6" />, roles: [Role.Manager] },
            { id: 'data', label: t('dataManagement'), description: t('dataManagementDesc'), icon: <DatabaseIcon className="w-6 h-6" />, roles: [Role.Manager] },
            { id: 'general', label: t('general'), description: t('generalSettingsDesc'), icon: <SettingsIcon className="w-6 h-6" /> },
            { id: 'notifications', label: t('notificationSettings'), description: t('notificationSettingsDesc'), icon: <BellIcon className="w-6 h-6" /> },
            { id: 'support', label: t('technicalSupport'), description: t('supportDescription'), icon: <LifebuoyIcon className="w-6 h-6" /> }
        ];

        return allItems.filter(item => !item.roles || (currentUser?.role && item.roles.includes(currentUser.role)));
    }, [t, currentUser]);

    const renderContent = () => {
        switch (activeSection) {
            case 'users':
                return currentUser?.role === Role.Manager ? <UserManagement users={props.users} onSaveUser={props.onSaveUser} onDeleteUser={props.onDeleteUser} /> : null;
            case 'data':
                 return currentUser?.role === Role.Manager ? <DataManagement {...props} /> : null;
            case 'notifications':
                return <NotificationSettings />;
            case 'support':
                return <Support />;
            case 'general':
            default:
                return <GeneralSettings />;
        }
    };
    
    const SettingsCard: React.FC<{
        title: string;
        description: string;
        icon: React.ReactNode;
        onClick: () => void;
        isLogout?: boolean;
    }> = ({ title, description, icon, onClick, isLogout = false }) => (
        <button
            onClick={onClick}
            className={`
                w-full p-5 text-left bg-white dark:bg-slate-800 rounded-xl shadow-md
                flex items-start gap-4 
                transition-all duration-300 ease-in-out transform
                hover:shadow-lg hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2
                ${isLogout
                    ? 'focus:ring-red-500'
                    : 'focus:ring-sky-500'}
                ${direction === 'rtl' ? 'flex-row-reverse' : ''}
            `}
        >
            <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg
                ${isLogout
                    ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                    : 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400'
                }`}
            >
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{description}</p>
            </div>
        </button>
    );

    if (activeSection) {
        const currentItem = navItems.find(item => item.id === activeSection);
        return (
            <div className="animate-fadeIn">
                <div className="mb-6 flex items-center gap-3">
                    <button 
                        onClick={() => setActiveSection(null)} 
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label={t('cancel')}
                    >
                        {direction === 'rtl' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg> : <ChevronLeftIcon />}
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentItem?.label}</h2>
                </div>
                {renderContent()}
            </div>
        );
    }
    
    return (
        <div className="space-y-6 animate-fadeIn">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('settings')}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {navItems.map(item => (
                    <SettingsCard
                        key={item.id}
                        title={item.label}
                        description={item.description}
                        icon={item.icon}
                        onClick={() => setActiveSection(item.id as SettingsSection)}
                    />
                ))}
                 <SettingsCard
                    title={t('logout')}
                    description={t('logoutDescription')}
                    icon={<LogoutIcon className="w-6 h-6" />}
                    onClick={logout}
                    isLogout
                />
            </div>
        </div>
    );
};

export default Settings;