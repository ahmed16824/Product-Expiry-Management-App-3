import React from 'react';
import { Product, ProductStatus } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export const getProductStatus = (expiryDate: string, notificationDays: number): ProductStatus => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); 
  const expiry = new Date(expiryDate);
  
  if (expiry < now) {
    return ProductStatus.Expired;
  }

  const NDaysFromNow = new Date();
  NDaysFromNow.setDate(now.getDate() + notificationDays);

  if (expiry <= NDaysFromNow) {
    return ProductStatus.NearExpiry;
  }

  return ProductStatus.Valid;
};

export const getDaysRemaining = (expiryDate: string): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStatusStyles = (status: ProductStatus): { badge: string; text: string; row: string; icon: React.ElementType } => {
    switch (status) {
      case ProductStatus.Valid:
        return { 
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', 
          text: 'text-emerald-600',
          row: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20',
          icon: CheckCircle2
        };
      case ProductStatus.NearExpiry:
        return { 
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', 
          text: 'text-amber-600',
          row: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20',
          icon: AlertTriangle
        };
      case ProductStatus.Expired:
        return { 
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          text: 'text-red-600',
          row: 'bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20',
          icon: XCircle
        };
      default:
        return { 
          badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400', 
          text: 'text-slate-600',
          row: 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800',
          icon: HelpCircle
        };
    }
  };
