import { Product, ScannableProduct, User } from '../types';

const DB_NAME = 'ProductExpiryDB';
const DB_VERSION = 1;
export const STORES = {
    products: 'products',
    scannableProducts: 'scannableProducts',
    users: 'users',
};

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORES.products)) {
                db.createObjectStore(STORES.products, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.scannableProducts)) {
                // Use a compound key path if 'code' is not unique across organizations
                const scannableStore = db.createObjectStore(STORES.scannableProducts, { keyPath: ['organizationId', 'code'] });
                scannableStore.createIndex('by_code', 'code', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.users)) {
                db.createObjectStore(STORES.users, { keyPath: 'id' });
            }
        };
    });
    return dbPromise;
};

export const getAll = async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const saveItem = async <T>(storeName: string, item: T): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const deleteItem = async (storeName: string, key: IDBValidKey): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const saveAll = async <T>(storeName: string, items: T[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        store.clear();
        items.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const deleteScannableProductsByCompany = async (companyName: string, unknownCompanyName: string, organizationId: string) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORES.scannableProducts, 'readwrite');
        const store = transaction.objectStore(STORES.scannableProducts);
        const request = store.openCursor();

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const product: ScannableProduct = cursor.value;
                if (product.organizationId === organizationId) {
                    const pCompany = product.company?.trim() || unknownCompanyName;
                    if (pCompany === companyName) {
                        cursor.delete();
                    }
                }
                cursor.continue();
            }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
