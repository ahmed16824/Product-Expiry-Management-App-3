import React, { useState, useCallback, useEffect, useReducer, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ScannableProduct, User, Role, ProductStatus } from './types';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Modal from './components/Modal';
import ProductForm from './components/ProductForm';
import Notifications from './components/Notifications';
import { DashboardIcon, SettingsIcon, BarcodeIcon, AppLogoIcon, LogoutIcon } from './components/Icons';
import { useSettings } from './context/SettingsContext';
import BarcodeScanner from './components/BarcodeScanner';
import { useNotifier } from './context/NotificationContext';
import ConfirmModal from './components/ConfirmModal';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import * as db from './utils/db';
import { getProductStatus } from './utils/productUtils';
import ToastContainer from './components/ToastNotifications';
import { useToaster } from './context/ToastContext';
import { useSound } from './context/SoundContext';

type View = 'dashboard' | 'settings';

interface AppData {
  products: Product[];
  scannableProducts: ScannableProduct[];
  users: User[];
}

const initialData: AppData = {
    products: [],
    scannableProducts: [],
    users: [],
};

type AppAction =
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'SAVE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'DELETE_PRODUCTS'; payload: string[] }
  | { type: 'SAVE_SCANNABLE_PRODUCT'; payload: ScannableProduct }
  | { type: 'DELETE_SCANNABLE_PRODUCT'; payload: string }
  | { type: 'IMPORT_SCANNABLE_PRODUCTS'; payload: ScannableProduct[] }
  | { type: 'DELETE_COMPANY_PRODUCTS'; payload: { companyName: string; unknownCompanyName: string; organizationId: string } }
  | { type: 'SAVE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string };


const appReducer = (state: AppData, action: AppAction): AppData => {
    switch (action.type) {
        case 'SET_DATA':
            return action.payload;
        case 'SAVE_PRODUCT': {
            const isEditing = state.products.some(p => p.id === action.payload.id);
            if (isEditing) {
                return { ...state, products: state.products.map(p => (p.id === action.payload.id ? action.payload : p)) };
            }
            return { ...state, products: [action.payload, ...state.products] };
        }
        case 'DELETE_PRODUCT':
            return { ...state, products: state.products.filter(p => p.id !== action.payload) };
        case 'DELETE_PRODUCTS':
            return { ...state, products: state.products.filter(p => !action.payload.includes(p.id)) };
        case 'SAVE_SCANNABLE_PRODUCT': {
            const isEditing = state.scannableProducts.some(p => p.code === action.payload.code && p.organizationId === action.payload.organizationId);
            const updatedScannableProducts = isEditing
                ? state.scannableProducts.map(p => (p.code === action.payload.code && p.organizationId === action.payload.organizationId) ? action.payload : p)
                : [...state.scannableProducts, action.payload];
            return { ...state, scannableProducts: updatedScannableProducts };
        }
        case 'DELETE_SCANNABLE_PRODUCT': {
             const productToDelete = state.scannableProducts.find(p => p.code === action.payload);
             if (!productToDelete) return state;
             return { ...state, scannableProducts: state.scannableProducts.filter(p => !(p.code === productToDelete.code && p.organizationId === productToDelete.organizationId)) };
        }
        case 'DELETE_COMPANY_PRODUCTS': {
            const { companyName, unknownCompanyName, organizationId } = action.payload;
            const updatedScannableProducts = state.scannableProducts.filter(p => {
                if (p.organizationId !== organizationId) return true;
                const pCompany = p.company?.trim() || unknownCompanyName;
                return pCompany !== companyName;
            });
            return { ...state, scannableProducts: updatedScannableProducts };
        }
        case 'IMPORT_SCANNABLE_PRODUCTS': {
            const existingProductsByCode = new Map(state.scannableProducts.map(p => [`${p.organizationId}-${p.code}`, p]));
            action.payload.forEach(newProduct => {
                if (newProduct.code && newProduct.organizationId) { 
                    existingProductsByCode.set(`${newProduct.organizationId}-${newProduct.code}`, newProduct);
                }
            });
            const updatedScannableProducts = Array.from(existingProductsByCode.values());
            return { ...state, scannableProducts: updatedScannableProducts };
        }
        case 'SAVE_USER': {
            const isEditing = state.users.some(u => u.id === action.payload.id);
            const users = isEditing
                ? state.users.map(u => u.id === action.payload.id ? action.payload : u)
                : [...state.users, action.payload];
            return { ...state, users };
        }
        case 'DELETE_USER': {
             return { ...state, users: state.users.filter(u => u.id !== action.payload) };
        }
        default:
            return state;
    }
};


const App: React.FC = () => {
    const { t, direction, notificationDays } = useSettings();
    const { addNotification, notifications, dismissNotification, clearSystemNotifications } = useNotifier();
    const { addToast } = useToaster();
    const { playSound } = useSound();
    const { currentUser, login, logout } = useAuth();
    
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [appData, dispatch] = useReducer(appReducer, initialData);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    // Reset view to dashboard when user logs in
    useEffect(() => {
        if (currentUser) {
            setCurrentView('dashboard');
        }
    }, [currentUser?.id]);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const loadData = async (silent = false) => {
            if (!silent) setIsLoadingData(true);
            try {
                // Try to get data from server first for multi-device sync
                let products: Product[] = [];
                let scannableProducts: ScannableProduct[] = [];
                let users: User[] = [];

                try {
                    const serverResponse = await fetch('/api/data');
                    if (serverResponse.ok) {
                        const serverData = await serverResponse.json();
                        if (serverData.users.length > 0) {
                            products = serverData.products;
                            scannableProducts = serverData.scannableProducts;
                            users = serverData.users;
                            
                            // Update local DB with server data
                            await Promise.all([
                                db.saveAll(db.STORES.products, products),
                                db.saveAll(db.STORES.scannableProducts, scannableProducts),
                                db.saveAll(db.STORES.users, users),
                            ]);
                        }
                    }
                } catch (e) {
                    console.warn("Server sync failed, falling back to local data", e);
                }

                // If server data was empty or failed, load from local DB
                if (users.length === 0) {
                    const [localProducts, localScannableProducts, localUsers] = await Promise.all([
                        db.getAll<Product>(db.STORES.products),
                        db.getAll<ScannableProduct>(db.STORES.scannableProducts),
                        db.getAll<User>(db.STORES.users),
                    ]);
                    products = localProducts;
                    scannableProducts = localScannableProducts;
                    users = localUsers;
                }

                if (users.length === 0) {
                    const orgId = `org_${Date.now()}`;
                    const demoManager: User = { id: 'user_manager_demo', username: 'manager', password_HACK: '123', role: Role.Manager, organizationId: orgId, organizationName: 'Demo Org' };
                    const demoEmployee: User = { id: 'user_employee_demo', username: 'employee', password_HACK: '123', role: Role.Employee, organizationId: orgId, organizationName: 'Demo Org', branchNames: ['Main'] };
                    await db.saveItem(db.STORES.users, demoManager);
                    await db.saveItem(db.STORES.users, demoEmployee);
                    users.push(demoManager, demoEmployee);
                }

                dispatch({ type: 'SET_DATA', payload: { products, scannableProducts, users } });
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                if (!silent) setIsLoadingData(false);
            }
        };
        
        loadData();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadData(true);
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => { if (!isLoadingData) db.saveAll(db.STORES.products, appData.products).catch(e => console.error("Failed to save products", e)); }, [appData.products, isLoadingData]);
    useEffect(() => { if (!isLoadingData) db.saveAll(db.STORES.scannableProducts, appData.scannableProducts).catch(e => console.error("Failed to save scannable products", e)); }, [appData.scannableProducts, isLoadingData]);
    useEffect(() => { if (!isLoadingData) db.saveAll(db.STORES.users, appData.users).catch(e => console.error("Failed to save users", e)); }, [appData.users, isLoadingData]);

    // Sync with server
    useEffect(() => {
        if (isLoadingData) return;
        const syncWithServer = async () => {
            try {
                await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appData)
                });
            } catch (e) {
                console.error("Failed to sync with server", e);
            }
        };
        const timeoutId = setTimeout(syncWithServer, 2000);
        return () => clearTimeout(timeoutId);
    }, [appData, isLoadingData]);

    const userProducts = useMemo(() => {
        if (!currentUser) return [];
        return appData.products.filter(p => {
            if (p.organizationId !== currentUser.organizationId) return false;
            if (p.createdBy) {
                return p.createdBy === currentUser.id;
            }
            // Fallback for legacy products without createdBy: show to manager
            return currentUser.role === Role.Manager;
        });
    }, [appData.products, currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const checkProducts = () => {
            userProducts.forEach(product => {
                const status = getProductStatus(product.expiryDate, notificationDays);
                if (status === ProductStatus.NearExpiry) {
                    const daysLeft = Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    if (daysLeft >= 0) {
                        addNotification(
                            t('productExpiryTitle'),
                            t('expiresInDays', { days: daysLeft }),
                            'info',
                            product.id
                        );
                    }
                }
            });
        };
        
        const timer = setTimeout(checkProducts, 2000);
        const intervalId = setInterval(checkProducts, 1000 * 60 * 60 * 4);
        return () => {
            clearTimeout(timer);
            clearInterval(intervalId);
        }
    }, [userProducts, notificationDays, addNotification, t, currentUser]);

    useEffect(() => {
        if (currentUser && !isLoadingData) {
            const updatedUser = appData.users.find(u => u.id === currentUser.id);
            if (!updatedUser) {
                logout();
                addToast(t('accountDeleted') || 'Your account has been deleted.', 'error');
            } else if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
                login(updatedUser);
            }
        }
    }, [appData.users, currentUser, login, logout, isLoadingData, addToast, t]);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [confirmDeleteState, setConfirmDeleteState] = useState<{ isOpen: boolean; productId: string | string[] } | null>(null);

    const userScannableProducts = useMemo(() => appData.scannableProducts.filter(p => p.organizationId === currentUser?.organizationId), [appData.scannableProducts, currentUser]);
    const organizationUsers = useMemo(() => appData.users.filter(u => u.organizationId === currentUser?.organizationId), [appData.users, currentUser]);

    const allOrganizationBranches = useMemo(() => {
        const branches = new Set<string>();
        organizationUsers.forEach(u => {
            if (u.branchNames) u.branchNames.forEach(b => branches.add(b));
            if ((u as any).branchName) branches.add((u as any).branchName);
        });
        userProducts.forEach(p => {
            if (p.branchName) branches.add(p.branchName);
        });
        return Array.from(branches).filter(Boolean).sort();
    }, [organizationUsers, userProducts]);

    const allCompanies = useMemo(() => {
        const companies = new Set<string>();
        userScannableProducts.forEach(p => {
            if (p.company) companies.add(p.company);
        });
        userProducts.forEach(p => {
            if (p.company) companies.add(p.company);
        });
        return Array.from(companies).filter(Boolean).sort();
    }, [userScannableProducts, userProducts]);

    // Handle browser back button
    useEffect(() => {
        // Set initial state if null
        if (!window.history.state) {
            window.history.replaceState({ view: 'dashboard' }, '');
        }

        const handlePopState = (event: PopStateEvent) => {
            // Close overlays in priority order
            if (isScannerOpen) {
                setIsScannerOpen(false);
                return;
            }
            
            if (confirmDeleteState) {
                setConfirmDeleteState(null);
                return;
            }

            if (isProductModalOpen) {
                setIsProductModalOpen(false);
                setProductToEdit(null);
                return;
            }

            // Handle View Navigation
            if (currentView === 'settings') {
                setCurrentView('dashboard');
                return;
            }
            
            // If we are at dashboard and popstate happens (user pressed back again),
            // we let the browser handle it (might exit app or do nothing if stack empty)
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isScannerOpen, isProductModalOpen, confirmDeleteState, currentView]);

    const handleAddProduct = useCallback(() => {
        window.history.pushState({ modal: true }, '');
        setProductToEdit(null);
        setIsProductModalOpen(true);
    }, []);

    const handleEditProduct = useCallback((product: Product) => {
        window.history.pushState({ modal: true }, '');
        setProductToEdit(product);
        setIsProductModalOpen(true);
    }, []);

    const handleSaveProduct = useCallback((product: Product) => {
        const productToSave = { 
            ...product, 
            organizationId: currentUser!.organizationId,
            createdBy: product.createdBy || currentUser!.id
        };
        const isEditing = appData.products.some(p => p.id === product.id);

        dispatch({ type: 'SAVE_PRODUCT', payload: productToSave });
        
        if (isEditing) {
            playSound('success');
            addNotification(
                t('productEditedTitle'),
                t('productEditedMessage', { name: product.name }),
                'info'
            );
        } else {
            playSound('success');
            addNotification(
                t('productAddedTitle'),
                t('productAddedMessage', { name: product.name }),
                'info'
            );
        }

        window.history.back(); // Close modal via history
    }, [currentUser, appData.products, addNotification, t]);
    
    const handleDeleteRequest = useCallback((productId: string) => {
        window.history.pushState({ modal: true }, '');
        setConfirmDeleteState({ isOpen: true, productId });
    }, []);
    
    const handleConfirmDelete = useCallback(() => {
        if (confirmDeleteState) {
            const isBulk = Array.isArray(confirmDeleteState.productId);
            
            if (isBulk) {
                const ids = confirmDeleteState.productId as string[];
                dispatch({ type: 'DELETE_PRODUCTS', payload: ids });
                ids.forEach(id => db.deleteItem(db.STORES.products, id).catch(e => console.error("Failed to delete product from DB", e)));
                playSound('delete');
                addToast(t('productsDeleted'), 'success');
            } else {
                const id = confirmDeleteState.productId as string;
                const productToDelete = appData.products.find(p => p.id === id);
                dispatch({ type: 'DELETE_PRODUCT', payload: id });
                db.deleteItem(db.STORES.products, id).catch(e => console.error("Failed to delete product from DB", e));
                
                if (productToDelete) {
                    playSound('delete');
                    addNotification(
                        t('productDeletedTitle'),
                        t('productDeletedMessage', { name: productToDelete.name }),
                        'info'
                    );
                }
                addToast(t('productDeleted'), 'success');
            }

            window.history.back(); // Close confirm modal via history
        }
    }, [confirmDeleteState, appData.products, addToast, t, addNotification]);
    
    const handleScanRequest = useCallback(() => {
        window.history.pushState({ scanner: true }, '');
        setIsScannerOpen(true);
    }, []);
    
    const handleScanSuccess = useCallback((code: string) => {
        // Replace scanner state with modal state to avoid double back requirement
        window.history.replaceState({ modal: true }, '');
        setIsScannerOpen(false);
        
        const matchingProduct = userScannableProducts.find(p => p.code === code);
        
        const userBranches = currentUser?.branchNames && currentUser.branchNames.length > 0 
          ? currentUser.branchNames 
          : (currentUser as any)?.branchName 
            ? [(currentUser as any).branchName] 
            : [];

        const newProductTemplate = {
            id: '', name: '', company: '', code: code,
            expiryDate: '', branchName: userBranches[0] || '', organizationId: currentUser!.organizationId
        };
        if (matchingProduct) {
            setProductToEdit({ ...newProductTemplate, name: matchingProduct.name, company: matchingProduct.company });
        } else {
            setProductToEdit(newProductTemplate);
        }
        setIsProductModalOpen(true);
    }, [userScannableProducts, addToast, t, currentUser]);
    
    const handleSaveScannableProduct = useCallback((product: ScannableProduct) => {
        const productToSave = { ...product, organizationId: currentUser!.organizationId };
        dispatch({ type: 'SAVE_SCANNABLE_PRODUCT', payload: productToSave });
    }, [currentUser]);

    const handleDeleteScannableProduct = useCallback((productCode: string) => {
        dispatch({ type: 'DELETE_SCANNABLE_PRODUCT', payload: productCode });
        db.deleteItem(db.STORES.scannableProducts, [currentUser!.organizationId, productCode]).catch(e => console.error("Failed to delete scannable product from DB", e));
        addToast(t('databaseProductDeleted'), 'success');
    }, [addToast, t, currentUser]);

    const handleImportScannableProducts = useCallback((products: ScannableProduct[]) => {
        const productsToImport = products.map(p => ({ ...p, organizationId: currentUser!.organizationId }));
        dispatch({ type: 'IMPORT_SCANNABLE_PRODUCTS', payload: productsToImport });
    }, [currentUser]);
    
    const handleDeleteCompanyProducts = useCallback((companyName: string) => {
        dispatch({ type: 'DELETE_COMPANY_PRODUCTS', payload: { companyName, unknownCompanyName: t('unknownCompany'), organizationId: currentUser!.organizationId } });
    }, [t, currentUser]);

    const handleSaveUser = useCallback((user: User) => {
        const userToSave = { ...user, organizationId: currentUser!.organizationId, organizationName: currentUser!.organizationName };
        dispatch({ type: 'SAVE_USER', payload: userToSave });
    }, [currentUser]);

    const handleDeleteUser = useCallback((userId: string) => {
        dispatch({ type: 'DELETE_USER', payload: userId });
        db.deleteItem(db.STORES.users, userId).catch(e => console.error("Failed to delete user from DB", e));
    }, []);
    
    const handleSignUp = useCallback((newUser: Pick<User, 'username' | 'password_HACK' | 'role' | 'organizationName'>, onFail: () => void) => {
        if (appData.users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
            addToast(t('usernameAlreadyExists'), 'error');
            onFail();
            return;
        }
        const orgId = `org_${Date.now()}`;
        const userToSave: User = {
            ...newUser,
            id: `user_${Date.now()}`,
            organizationId: orgId,
        };
        dispatch({ type: 'SAVE_USER', payload: userToSave });
        addToast(t('accountCreatedSuccess'), 'success');
        login(userToSave);
    }, [appData.users, addToast, t, login]);

    if (isLoadingData) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950">
                 <AppLogoIcon className="w-20 h-20 animate-pulse-bg" />
            </div>
        );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'settings':
                return <Settings 
                            scannableProducts={userScannableProducts}
                            onSaveScannableProduct={handleSaveScannableProduct}
                            onDeleteScannableProduct={handleDeleteScannableProduct}
                            onImportScannableProducts={handleImportScannableProducts}
                            onDeleteCompanyProducts={handleDeleteCompanyProducts}
                            users={organizationUsers}
                            onSaveUser={handleSaveUser}
                            onDeleteUser={handleDeleteUser}
                       />;
            case 'dashboard':
            default:
                return <Dashboard 
                            products={userProducts}
                            onAddProduct={handleAddProduct}
                            onEditProduct={handleEditProduct}
                            onDeleteProduct={handleDeleteRequest}
                            onDeleteProducts={(ids) => {
                                window.history.pushState({ modal: true }, '');
                                setConfirmDeleteState({ isOpen: true, productId: ids });
                            }}
                            notificationDays={notificationDays}
                       />;
        }
    };
    
    const NavButton = ({ view, label, icon }: { view: View; label: string; icon: React.ReactNode }) => (
        <button
          onClick={() => {
              playSound('click');
              if (view === currentView) return;
              if (view === 'settings') {
                  window.history.pushState({ view: 'settings' }, '');
                  setCurrentView('settings');
              } else {
                  if (currentView === 'settings') {
                      window.history.back();
                  } else {
                      setCurrentView('dashboard');
                  }
              }
          }}
          className={`flex-1 flex flex-col items-center justify-center p-2 text-xs font-bold transition-all duration-300 ${
            currentView === view 
                ? 'text-brand-600 dark:text-brand-400 scale-110' 
                : 'text-slate-400 dark:text-slate-500 hover:text-brand-500'
          }`}
        >
          <div className={`mb-1 p-2 rounded-xl transition-all ${currentView === view ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
            {icon}
          </div>
          <span className="uppercase tracking-widest text-[10px]">{label}</span>
        </button>
    );

    return (
        <>
            {!currentUser ? (
                <LoginScreen users={appData.users} onSignUp={handleSignUp} />
            ) : (
                <div className="flex flex-col h-full">
                    <header className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 dark:border-slate-800/50 p-2 flex justify-between items-center sticky top-0 z-30">
                        <div className="flex items-center gap-2">
                            <motion.div 
                              whileHover={{ rotate: 10 }}
                              className="p-2 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-500/20"
                            >
                                <AppLogoIcon className="w-5 h-5" />
                            </motion.div>
                            <div>
                              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display leading-tight">{currentUser.organizationName}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Notifications 
                                allNotifications={notifications} 
                                onEditProduct={handleEditProduct}
                                products={userProducts}
                                onDismissSystemNotification={dismissNotification}
                                onClearSystemNotifications={clearSystemNotifications}
                            />
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            <button 
                              onClick={() => {
                                  playSound('click');
                                  logout();
                              }} 
                              className="text-slate-400 dark:text-slate-500 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all" 
                              aria-label={t('logout')}
                            >
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4 bg-slate-50 dark:bg-slate-950">
                        <div className="max-w-7xl mx-auto">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={currentView}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                {renderContent()}
                              </motion.div>
                            </AnimatePresence>
                        </div>
                    </main>

                    <footer className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 sticky bottom-0 z-30 pb-safe">
                         <nav className="flex justify-around items-center h-16 px-4 max-w-md mx-auto relative">
                            <NavButton view="dashboard" label={t('dashboard')} icon={<DashboardIcon className="w-5 h-5" />} />
                            
                            <div className="relative -top-6 flex justify-center w-20">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        playSound('click');
                                        handleScanRequest();
                                    }} 
                                    className="absolute w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-brand-500/40 border-4 border-slate-50 dark:border-slate-950"
                                >
                                   <BarcodeIcon className="w-7 h-7"/>
                                </motion.button>
                            </div>

                            <NavButton view="settings" label={t('settings')} icon={<SettingsIcon className="w-5 h-5" />} />
                        </nav>
                    </footer>
                </div>
            )}
            
            {currentUser && (
                <>
                    <Modal 
                        isOpen={isProductModalOpen} 
                        onClose={() => window.history.back()} 
                        title={productToEdit?.id ? t('editProductTitle') : t('addProductTitle')}
                    >
                        <ProductForm 
                            onSave={handleSaveProduct}
                            onClose={() => window.history.back()}
                            productToEdit={productToEdit}
                            scannableProducts={userScannableProducts}
                            onScanRequest={handleScanRequest}
                            allOrganizationBranches={allOrganizationBranches}
                            allCompanies={allCompanies}
                        />
                    </Modal>
                    
                    <ConfirmModal
                        isOpen={confirmDeleteState?.isOpen ?? false}
                        onClose={() => window.history.back()}
                        onConfirm={handleConfirmDelete}
                        title={Array.isArray(confirmDeleteState?.productId) ? t('confirmDeleteProductsTitle') : t('confirmDeleteProductTitle')}
                    >
                        {Array.isArray(confirmDeleteState?.productId) 
                            ? t('confirmDeleteProductsMessage', { count: confirmDeleteState.productId.length }) 
                            : t('confirmDeleteProduct')}
                    </ConfirmModal>
                </>
            )}
            
            {isScannerOpen && <BarcodeScanner onScanSuccess={handleScanSuccess} onClose={() => window.history.back()} />}
            <ToastContainer />
        </>
    );
};

export default App;