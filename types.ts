export enum ProductStatus {
  Valid = 'ProductStatus.Valid',
  NearExpiry = 'ProductStatus.NearExpiry',
  Expired = 'ProductStatus.Expired',
}

export interface ScannableProduct {
  code: string;
  name: string;
  company?: string;
  organizationId: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  company?: string;
  expiryDate: string;
  branchName?: string;
  organizationId: string;
  createdBy?: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'ar' | 'en' | 'system';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface SystemNotification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  productId?: string;
}

// FIX: Added Role enum and User interface to resolve missing type export errors.
export enum Role {
  Manager = 'manager',
  Employee = 'employee',
}

export interface User {
  id: string;
  username: string;
  password_HACK: string;
  role: Role;
  organizationId: string;
  organizationName: string;
  branchNames?: string[];
}