import React, { useState, useRef, useEffect } from 'react';
import { Product, SystemNotification, ProductStatus } from '../types';
import { getStatusStyles } from '../utils/productUtils';
import { BellIcon } from './Icons';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsProps {
  allNotifications: SystemNotification[];
  onEditProduct: (product: Product) => void;
  products: Product[];
  onDismissSystemNotification: (id: string) => void;
  onClearSystemNotifications: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ 
  allNotifications,
  onEditProduct,
  products,
  onDismissSystemNotification,
  onClearSystemNotifications
}) => {
  const { t, direction } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const prevNotificationCount = useRef<number>(0);
  const [isPulsing, setIsPulsing] = useState(false);

  const systemNotifications = allNotifications.filter(n => !n.productId);
  const productNotifications = allNotifications.filter(n => n.productId);

  const notificationCount = allNotifications.length;

  useEffect(() => {
    if (notificationCount > prevNotificationCount.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1500);
      return () => clearTimeout(timer);
    }
    prevNotificationCount.current = notificationCount;
  }, [notificationCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [componentRef]);

  return (
    <div className="relative" ref={componentRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <BellIcon className={`w-6 h-6 transition-transform duration-300 ${isPulsing ? 'scale-110' : ''}`} />
        {notificationCount > 0 && (
          <span className={`absolute top-1.5 flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 ${direction === 'rtl' ? 'left-1.5' : 'right-1.5'}`}>
            {notificationCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`
              absolute top-full mt-3 w-80 md:w-96
              bg-white dark:bg-slate-900 
              rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800
              flex flex-col overflow-hidden
              max-h-[calc(100vh-120px)]
              z-50
              ${direction === 'rtl' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}
            `}
          >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{t('notifications')}</h3>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-slate-400 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {notificationCount > 0 ? (
                  <>
                    {systemNotifications.length > 0 && (
                      <div className="pb-2">
                        <div className="flex justify-between items-center px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-10 backdrop-blur-sm">
                          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('systemAlerts')}</h4>
                          <button onClick={onClearSystemNotifications} className="text-[10px] font-black text-brand-600 dark:text-brand-400 hover:underline uppercase tracking-widest">{t('clearAll')}</button>
                        </div>
                        <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                          {systemNotifications.map(notif => (
                            <li key={notif.id} className="p-4 flex justify-between items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className={`flex-1 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                                <p className={`text-sm font-medium ${notif.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{notif.message}</p>
                              </div>
                              <button onClick={() => onDismissSystemNotification(notif.id)} className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 ${direction === 'rtl' ? 'mr-3' : 'ml-3'}`}>
                                 <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {productNotifications.length > 0 && (
                       <div>
                          <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-10 backdrop-blur-sm">
                              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('productExpiryAlerts')}</h4>
                          </div>
                          <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                            {productNotifications.map(notification => {
                                const product = products.find(p => p.id === notification.productId);
                                if (!product) return null;
                                
                                const { text, badge } = getStatusStyles(ProductStatus.NearExpiry);
                                const daysLeft = Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                return (
                                <li key={notification.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <button 
                                      onClick={() => { onEditProduct(product); setIsOpen(false); }} 
                                      className={`w-full p-5 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
                                    >
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{product.name}</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${badge}`}>
                                          {t('nearExpiry')}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-2">{product.code}</p>
                                      <div className="flex items-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        <svg className="w-3.5 h-3.5 mr-1.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {t('expiresInDays', { days: daysLeft })}
                                        <span className="mx-2 opacity-20">|</span>
                                        {product.expiryDate}
                                      </div>
                                    </button>
                                </li>
                                );
                            })}
                          </ul>
                       </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BellIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('noNotifications')}</p>
                  </div>
                )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
