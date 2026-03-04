import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScannableProduct, ToastType } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useToaster } from '../../context/ToastContext';
import Modal from '../Modal';
import ConfirmModal from '../ConfirmModal';
import {
    PlusIcon, PencilIcon, TrashIcon, DownloadIcon, UploadIcon, DatabaseIcon,
    ChevronLeftIcon, MagnifyingGlassIcon, BuildingOfficeIcon
} from '../Icons';
import { exportDatabaseToExcel, downloadTemplateExcel } from '../../utils/excelExport';

declare var XLSX: any;

// FIX: Changed row type to Record<string, unknown> for better type safety when handling unpredictable data from Excel files.
const findValueInRow = (row: Record<string, unknown>, keys: string[]): string | null => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        const foundRowKey = rowKeys.find(rk => rk.trim().toLowerCase() === key.toLowerCase());
        if (foundRowKey && row[foundRowKey] !== null && row[foundRowKey] !== undefined) {
            const value = row[foundRowKey];
            // FIX: The value from the row can be of any type, so we explicitly convert it to a string for type safety.
            return String(value);
        }
    }
    return null;
};

interface ScannableProductFormProps {
    onSave: (name: string, code: string, company?: string) => void;
    onClose: () => void;
    initialProduct?: ScannableProduct | null;
    initialCompany?: string;
}

const ScannableProductForm: React.FC<ScannableProductFormProps> = ({ onSave, onClose, initialProduct, initialCompany }) => {
    const { t, direction } = useSettings();
    const [name, setName] = useState(initialProduct?.name || '');
    const [company, setCompany] = useState(initialProduct?.company || initialCompany || '');
    const [code, setCode] = useState(initialProduct?.code || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(name, code, company); };
    const inputBaseClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm";
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="productName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('productNameLabel')}</label>
                <input type="text" id="productName" value={name} onChange={e => setName(e.target.value)} className={inputBaseClasses} required />
            </div>
            <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('companyNameLabel')}</label>
                <input type="text" id="companyName" value={company} onChange={e => setCompany(e.target.value)} disabled={!!initialCompany && !initialProduct} className={`${inputBaseClasses} disabled:bg-slate-100 dark:disabled:bg-slate-600`} />
            </div>
            <div>
                <label htmlFor="productCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('productCodeLabel')}</label>
                <input type="text" id="productCode" value={code} onChange={e => setCode(e.target.value)} disabled={!!initialProduct} className={`${inputBaseClasses} disabled:bg-slate-100 dark:disabled:bg-slate-600`} required />
            </div>
            <div className={`flex justify-end pt-4 space-x-2 ${direction === 'rtl' ? 'space-x-reverse' : ''}`}>
                <button type="button" onClick={onClose} className="bg-white dark:bg-slate-600 py-2 px-4 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95">{t('cancel')}</button>
                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all active:scale-95">{t('save')}</button>
            </div>
        </form>
    );
};

interface DataManagementProps {
    scannableProducts: ScannableProduct[];
    onSaveScannableProduct: (product: ScannableProduct) => void;
    onDeleteScannableProduct: (productCode: string) => void;
    onImportScannableProducts: (products: ScannableProduct[]) => void;
    onDeleteCompanyProducts: (companyName: string) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({
    scannableProducts,
    onSaveScannableProduct,
    onDeleteScannableProduct,
    onImportScannableProducts,
    onDeleteCompanyProducts,
}) => {
    const { t, direction } = useSettings();
    const { addToast } = useToaster();

    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<ScannableProduct | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [newCompanyName, setNewCompanyName] = useState('');
    const [allCompanyNames, setAllCompanyNames] = useState<Set<string>>(new Set());
    const [confirmDeleteCompanyState, setConfirmDeleteCompanyState] = useState<{ isOpen: boolean; companyName: string; } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const companyNames = new Set(scannableProducts.map(p => p.company?.trim() || t('unknownCompany')));
        setAllCompanyNames(companyNames);
    }, [scannableProducts, t]);

    const groupedScannableProducts = useMemo(() => {
        const groups: Record<string, ScannableProduct[]> = {};
        scannableProducts.forEach(product => {
            const companyName = product.company?.trim() || t('unknownCompany');
            if (!groups[companyName]) {
                groups[companyName] = [];
            }
            groups[companyName].push(product);
        });
        for (const company in groups) {
            groups[company].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base'}));
        }
        return groups;
    }, [scannableProducts, t]);
    
    const handleAddCompany = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newCompanyName.trim();
        if (!trimmedName) return;

        const exists = Array.from(allCompanyNames).some((name: string) => name.toLowerCase() === trimmedName.toLowerCase());

        if (exists) {
            addToast(t('companyExistsError'), 'error');
        } else {
            setAllCompanyNames(prev => new Set([...Array.from(prev), trimmedName]));
            setNewCompanyName('');
        }
    };
    
    const handleDeleteCompany = (companyName: string) => {
        setConfirmDeleteCompanyState({ isOpen: true, companyName });
    };

    const confirmDeleteCompany = () => {
        if (confirmDeleteCompanyState) {
            onDeleteCompanyProducts(confirmDeleteCompanyState.companyName);
            setAllCompanyNames(prev => {
                const newSet = new Set(prev);
                newSet.delete(confirmDeleteCompanyState.companyName);
                return newSet;
            });
            setConfirmDeleteCompanyState(null);
            addToast(t('companyDeleted'), 'success');
        }
    };

    const handleOpenProductModal = (product: ScannableProduct | null) => {
        setProductToEdit(product);
        setIsProductModalOpen(true);
    };

    const handleSaveScannableProduct = (name: string, code: string, company?: string) => {
        if (!name.trim() || !code.trim()) return;
        const finalCompany = (company || selectedCompany || '').trim();
        onSaveScannableProduct({ name: name.trim(), code: code.trim(), company: finalCompany === t('unknownCompany') ? undefined : finalCompany });
        setIsProductModalOpen(false);
        setProductToEdit(null);
    };
    
    const handleExportCompanyDatabase = () => {
        if (!selectedCompany) return;
        const productsForCompany = groupedScannableProducts[selectedCompany] || [];
        if (productsForCompany.length === 0) return;

        exportDatabaseToExcel(productsForCompany, selectedCompany, t, direction);
    };

    const handleDownloadTemplate = () => {
        downloadTemplateExcel(t, direction, selectedCompany || undefined);
    };
    
    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedCompany) return;
        
        const companyForImport = selectedCompany === t('unknownCompany') ? undefined : selectedCompany;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                
                // FIX: The `json` result from the library can contain non-object rows. This adds a type guard
                // to ensure we only process valid object rows, preventing runtime errors.
                const importedProducts: ScannableProduct[] = json.map((row: unknown) => {
                    if (typeof row !== 'object' || row === null) {
                        return null;
                    }
                    // FIX: Changed row type assertion to Record<string, unknown> for better type safety.
                    const typedRow = row as Record<string, unknown>;
                    const name = findValueInRow(typedRow, [t('productName'), 'Product Name', 'اسم المنتج']);
                    const code = findValueInRow(typedRow, [t('code'), 'Code', 'الكود', 'Barcode']);
                    const companyFromFile = findValueInRow(typedRow, [t('companyName'), 'Company Name', 'اسم الشركة', 'Company']);

                    if (name && code) {
                        const productCompany = (companyFromFile || companyForImport || '').trim();
                        return { 
                            name: name.trim(), code: code.trim(), 
                            company: productCompany === t('unknownCompany') ? undefined : (productCompany || undefined)
                        };
                    }
                    return null;
                }).filter((p): p is ScannableProduct => p !== null);

                if (importedProducts.length > 0) {
                    onImportScannableProducts(importedProducts);
                    addToast(t('importSuccess', { count: importedProducts.length }), 'success');
                } else {
                    addToast(t('importInvalidFormat'), 'error');
                }
            } catch (error) {
                console.error("Error importing file:", error);
                addToast(t('importError'), 'error');
            } finally { if (event.target) event.target.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    };

    const filteredProducts = useMemo(() => {
        if (!selectedCompany) return [];
        const products = groupedScannableProducts[selectedCompany] || [];
        if (!searchTerm) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [selectedCompany, groupedScannableProducts, searchTerm]);
    
    interface CompanyCardProps {
        companyName: string;
        productCount: number;
        onManage: () => void;
        onDelete: () => void;
    }

    const CompanyCard: React.FC<CompanyCardProps> = ({ companyName, productCount, onManage, onDelete }) => (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400">
                      <BuildingOfficeIcon className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{companyName}</h4>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                          {t('totalProducts')}: {productCount}
                      </span>
                  </div>
              </div>
              <button onClick={onDelete} className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 transition-colors active:scale-95">
                  <TrashIcon className="w-4 h-4" />
              </button>
          </div>
          <button onClick={onManage} className="w-full flex items-center justify-center gap-2 text-sm bg-slate-600 dark:bg-slate-700 text-white px-3 py-2 rounded-lg shadow-md hover:bg-slate-700 dark:hover:bg-slate-600 transition-all active:scale-95">
              <PencilIcon className="w-4 h-4" />
              {t('manage')}
          </button>
      </div>
    );

    return (
        <>
            {selectedCompany ? (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 h-full flex flex-col animate-slideInUp">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden"/>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b dark:border-slate-700">
                        <div className="flex items-center gap-3">
                             <button onClick={() => setSelectedCompany(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                               {direction === 'rtl' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg> : <ChevronLeftIcon />}
                             </button>
                             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedCompany}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-sm bg-slate-600 text-white px-3 py-2 rounded-lg shadow-md hover:bg-slate-700 transition-all active:scale-95"><DownloadIcon className="w-4 h-4" />{t('downloadTemplate') || 'تحميل نموذج'}</button>
                            <button onClick={() => handleOpenProductModal(null)} className="flex items-center gap-2 text-sm bg-sky-600 text-white px-3 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-all active:scale-95"><PlusIcon className="w-4 h-4" />{t('addProductToDatabase')}</button>
                            <button onClick={handleImportClick} className="flex items-center gap-2 text-sm bg-purple-600 text-white px-3 py-2 rounded-lg shadow-md hover:bg-purple-700 transition-all active:scale-95"><UploadIcon className="w-4 h-4" />{t('importDatabase')}</button>
                            <button onClick={handleExportCompanyDatabase} className="flex items-center gap-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow-md hover:bg-green-700 transition-all active:scale-95"><DownloadIcon className="w-4 h-4" />{t('exportDatabase')}</button>
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder={t('searchProducts')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-sky-500 focus:border-sky-500 ${direction === 'rtl' ? 'pr-10' : 'pl-10'}`}
                        />
                        <div className={`absolute inset-y-0 flex items-center text-slate-400 ${direction === 'rtl' ? 'right-3' : 'left-3'}`}>
                            <MagnifyingGlassIcon />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto -mx-6 px-6">
                        {filteredProducts.length > 0 ? (
                            <div className="space-y-3">
                                {filteredProducts.map(product => (
                                    <div key={product.code} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 flex justify-between items-center transition-all hover:shadow-sm hover:scale-[1.02]">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono tracking-wider">{product.code}</p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0">
                                            <button onClick={() => handleOpenProductModal(product)} className="p-2 rounded-full text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-slate-600 transition-colors active:scale-90"><PencilIcon /></button>
                                            <button onClick={() => onDeleteScannableProduct(product.code)} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-600 transition-colors active:scale-90"><TrashIcon /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <div className="text-center py-16">
                               <p className="text-slate-500 dark:text-slate-400">{searchTerm ? t('noProductsFound') : t('getStartedByAddingProduct')}</p>
                           </div>
                        )}
                    </div>
                </div>
            ) : (
              <div className="space-y-6">
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('manageCompanies')}</h3>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">{t('dataManagementDesc')}</p>
                      <form onSubmit={handleAddCompany} className="flex flex-col sm:flex-row gap-2 mt-4">
                         <input
                             type="text"
                             value={newCompanyName}
                             onChange={e => setNewCompanyName(e.target.value)}
                             placeholder={t('enterCompanyName')}
                             className="flex-grow px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                             required
                         />
                         <button type="submit" className="flex items-center justify-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-all active:scale-95">
                             <BuildingOfficeIcon className="w-5 h-5"/> {t('addCompany')}
                         </button>
                      </form>
                  </div>

                  <div className="space-y-4">
                      {Array.from(allCompanyNames).sort().length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {(Array.from(allCompanyNames).sort() as string[]).map(companyName => (
                                  <CompanyCard 
                                      key={companyName}
                                      companyName={companyName}
                                      productCount={groupedScannableProducts[companyName]?.length || 0}
                                      onManage={() => setSelectedCompany(companyName)}
                                      onDelete={() => handleDeleteCompany(companyName)}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-lg shadow border-2 border-dashed dark:border-slate-700">
                              <DatabaseIcon className="mx-auto h-12 w-12 text-slate-400" />
                              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-200">{t('noCompaniesFound')}</h3>
                              <p className="mt-1 text-sm text-slate-500">{t('getStartedByAddingCompany')}</p>
                          </div>
                      )}
                  </div>
              </div>
            )}

            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={productToEdit ? t('editProductInDatabaseTitle') : t('addProductToDatabaseTitle')}>
                <ScannableProductForm
                  onSave={handleSaveScannableProduct}
                  onClose={() => setIsProductModalOpen(false)}
                  initialProduct={productToEdit}
                  initialCompany={selectedCompany ?? undefined}
                />
            </Modal>

            <ConfirmModal
              isOpen={confirmDeleteCompanyState?.isOpen ?? false}
              onClose={() => setConfirmDeleteCompanyState(null)}
              onConfirm={confirmDeleteCompany}
              // FIX: Coerced translation result to a string using String() to resolve type inference issues.
              title={String(t('confirmDeleteCompanyTitle'))}
            >
              {
                // FIX: Coerced translation result to a string using String() to resolve type inference issues.
                String(t('confirmDeleteCompanyMessage', { companyName: confirmDeleteCompanyState?.companyName || ''}))
              }
            </ConfirmModal>
        </>
    );
};

export default DataManagement;