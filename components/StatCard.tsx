import React, { ReactNode } from 'react';
import { useSettings } from '../context/SettingsContext';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  onClick: () => void;
  isActive: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick, isActive }) => {
  const { direction } = useSettings();
  const colorClasses: Record<string, { bg: string; text: string; ring: string; darkBg: string; shadow: string; accent: string }> = {
    sky: { bg: 'bg-brand-50', text: 'text-brand-600', ring: 'ring-brand-500', darkBg: 'dark:bg-brand-900/20', shadow: 'shadow-brand-500/10', accent: 'bg-brand-500' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500', darkBg: 'dark:bg-emerald-900/20', shadow: 'shadow-emerald-500/10', accent: 'bg-emerald-500' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-500', darkBg: 'dark:bg-amber-900/20', shadow: 'shadow-amber-500/10', accent: 'bg-amber-500' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-500', darkBg: 'dark:bg-rose-900/20', shadow: 'shadow-rose-500/10', accent: 'bg-rose-500' },
  };

  const styles = colorClasses[color] || colorClasses.sky;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative w-full p-3 glass-card rounded-2xl flex flex-col gap-2
        transition-all duration-300
        focus:outline-none overflow-hidden
        ${isActive ? `ring-2 ring-brand-500 shadow-2xl ${styles.shadow}` : 'hover:shadow-xl'}
        ${direction === 'rtl' ? 'text-right' : 'text-left'}
      `}
    >
      {isActive && (
        <div className={`absolute top-0 ${direction === 'rtl' ? 'right-0' : 'left-0'} w-1.5 h-full ${styles.accent}`}></div>
      )}
      
      <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${styles.bg} ${styles.darkBg} transition-all`}>
        <div className={styles.text}>
            {icon}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">{value}</p>
      </div>
    </motion.button>
  );
};

export default StatCard;