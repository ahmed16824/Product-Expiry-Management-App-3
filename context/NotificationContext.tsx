import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { SystemNotification, ToastType } from '../types';
import { useSound } from './SoundContext';

interface NotificationContextType {
  notifications: SystemNotification[];
  addNotification: (title: string, message: string, type: ToastType, productId?: string) => void;
  dismissNotification: (id: string) => void;
  clearSystemNotifications: () => void;
  requestPermission: () => Promise<void>;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );
  const { playSound } = useSound();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }, []);

  const addNotification = useCallback((title: string, message: string, type: ToastType, productId?: string) => {
    const id = `notif_${Date.now()}_${Math.random()}`;
    
    // Play sound based on notification type
    if (type === 'error') {
        playSound('error');
    } else if (type === 'warning') {
        playSound('warning');
    } else {
        playSound('notification');
    }

    setNotifications(prev => {
        // Prevent duplicate product notifications
        if (productId && prev.some(n => n.productId === productId)) {
            return prev;
        }
        const newNotification: SystemNotification = { id, title, message, type, productId };
        return [newNotification, ...prev];
    });

    // Native browser notification logic
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: message,
                icon: "data:image/svg+xml,%3csvg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3clinearGradient id='logoGradient' x1='0' y1='0' x2='1' y2='1'%3e%3cstop offset='0%25' stop-color='%2338bdf8'/%3e%3cstop offset='100%25' stop-color='%230ea5e9'/%3e%3c/linearGradient%3e%3c/defs%3e%3cpath d='M8 4H16C18.2091 4 20 5.79086 20 8V16C20 18.2091 18.2091 20 16 20H8C5.79086 20 4 18.2091 4 16V8C4 5.79086 5.79086 4 8 4Z' fill='url(%23logoGradient)'/%3e%3cpath d='M9 8V16' stroke='white' stroke-width='2' stroke-linecap='round'/%3e%3cpath d='M15 8H9' stroke='white' stroke-width='2' stroke-linecap='round'/%3e%3cpath d='M14 12H9' stroke='white' stroke-width='2' stroke-linecap='round'/%3e%3cpath d='M15 16H9' stroke='white' stroke-width='2' stroke-linecap='round'/%3e%3c/svg%3e",
            });
        });
      } catch (e) {
          console.error("Error showing notification:", e);
      }
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const clearSystemNotifications = useCallback(() => {
    setNotifications(prev => prev.filter(n => n.productId)); // Keep only product notifications
  }, []);

  const value = { notifications, addNotification, dismissNotification, clearSystemNotifications, requestPermission, permission };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifier = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifier must be used within a NotificationProvider');
  }
  return context;
};