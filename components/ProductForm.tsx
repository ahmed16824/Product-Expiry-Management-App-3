import React, { useState, useEffect, useRef } from 'react';
import { Product, ScannableProduct, Role } from '../types';
import { CameraIcon, PhotoIcon } from './Icons';
import { useSettings } from '../context/SettingsContext';
import { useToaster } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { GoogleGenAI } from "@google/genai";
import BarcodeScanner from './BarcodeScanner';

interface ProductFormProps {
  onSave: (product: Product) => void;
  onClose: () => void;
  productToEdit: Product | null;
  scannableProducts: ScannableProduct[];
  onScanRequest?: () => void;
  allOrganizationBranches: string[];
  allCompanies: string[];
}

const ProductForm: React.FC<ProductFormProps> = ({ onSave, onClose, productToEdit, scannableProducts, onScanRequest, allOrganizationBranches, allCompanies }) => {
  const { t, direction } = useSettings();
  const { addToast } = useToaster();
  const { currentUser } = useAuth();
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [isInlineScannerOpen, setIsInlineScannerOpen] = useState(false);
  const [product, setProduct] = useState<Product>({
    id: '',
    name: '',
    company: '',
    code: '',
    expiryDate: '',
    branchName: '',
    organizationId: '',
  });

  const userBranches = currentUser?.branchNames && currentUser.branchNames.length > 0 
    ? currentUser.branchNames 
    : (currentUser as any)?.branchName 
      ? [(currentUser as any).branchName] 
      : [];

  const employeeBranches = userBranches.length > 0 ? userBranches : allOrganizationBranches;

  const [isAddingNewBranch, setIsAddingNewBranch] = useState(false);

  const lookupProductByCode = async (code: string) => {
    if (!code) return;
    
    // First check local database
    const matchingProduct = scannableProducts.find(p => p.code === code);
    if (matchingProduct) {
      setProduct(prev => ({
        ...prev,
        code,
        name: matchingProduct.name,
        company: matchingProduct.company || ''
      }));
      return;
    }

    // If not found locally, use Gemini to identify the product
    setIsSearchingProduct(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const lang = direction === 'rtl' ? 'Arabic' : 'English';
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        config: {
          responseMimeType: "application/json",
        },
        contents: [
          {
            text: `Identify the product name and manufacturer/company for the barcode number: ${code}. 
            Return a JSON object with 'name' and 'company' fields. 
            Provide the 'name' and 'company' in ${lang} if possible.
            If you are not absolutely sure, return empty strings for both.
            Example: {"name": "Coca Cola 330ml", "company": "The Coca-Cola Company"}`,
          },
        ],
      });

      const result = JSON.parse(response.text || '{}');
      if (result.name) {
        setProduct(prev => ({
          ...prev,
          code,
          name: result.name,
          company: result.company || ''
        }));
        addToast(t('productFound') || 'Product identified successfully', 'success');
      } else {
        addToast(t('productNotFoundInDatabase') || 'Product not found, please enter details manually', 'info');
      }
    } catch (error) {
      console.error("Error looking up product:", error);
      addToast(t('productNotFoundInDatabase') || 'Product not found, please enter details manually', 'info');
    } finally {
      setIsSearchingProduct(false);
    }
  };

  useEffect(() => {
    if (productToEdit) {
      setProduct({
        ...productToEdit,
        id: productToEdit.id || `prod_${Date.now()}`, // Ensure ID exists for new scanned products
        branchName: productToEdit.branchName || (currentUser?.role === Role.Manager ? allOrganizationBranches[0] : employeeBranches[0]) || '',
      });
      if (currentUser?.role === Role.Manager && productToEdit.branchName && !allOrganizationBranches.includes(productToEdit.branchName)) {
          setIsAddingNewBranch(true);
      }
      
      // Auto-lookup if code exists but name is empty (e.g., from scanner)
      if (productToEdit.code && !productToEdit.name) {
          lookupProductByCode(productToEdit.code);
      }
    } else {
        setProduct({
            id: `prod_${Date.now()}`,
            name: '',
            company: '',
            code: '',
            expiryDate: '',
            branchName: (currentUser?.role === Role.Manager ? allOrganizationBranches[0] : employeeBranches[0]) || '',
            organizationId: '',
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productToEdit, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    const updatedProduct: Product = { ...product, [name]: value };
    setProduct(updatedProduct);

    if (name === 'code' && value.length >= 8) {
      lookupProductByCode(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product.name && product.code && product.expiryDate) {
        onSave(product);
    } else {
        addToast(t('fillAllFields'), 'error');
    }
  };

  const handleInlineScanSuccess = (code: string) => {
    lookupProductByCode(code);
    setIsInlineScannerOpen(false);
  };

  const inputBaseClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm";
  const codeInputClassName = `focus:ring-sky-500 focus:border-sky-500 flex-1 block w-full sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 ${direction === 'rtl' ? 'rounded-none rounded-r-md' : 'rounded-none rounded-l-md'}`;
  const cameraButtonClassName = `inline-flex items-center px-3 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${direction === 'rtl' ? 'rounded-l-md border-r-0 dark:border-l-slate-600 dark:border-r-0' : 'rounded-r-md border-l-0 dark:border-r-slate-600 dark:border-l-0'}`;
  const dateInputClassName = `focus:ring-sky-500 focus:border-sky-500 flex-1 block w-full sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:[color-scheme:dark] ${direction === 'rtl' ? 'rounded-none rounded-r-md' : 'rounded-none rounded-l-md'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('productNameLabel')}</label>
        <input
          type="text"
          name="name"
          id="name"
          value={product.name}
          onChange={handleChange}
          className={inputBaseClasses}
          required
        />
      </div>
      
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('companyNameLabel')}</label>
        <input
          type="text"
          name="company"
          id="company"
          list="companies-list"
          value={product.company || ''}
          onChange={handleChange}
          className={inputBaseClasses}
        />
        <datalist id="companies-list">
          {allCompanies.map(company => (
            <option key={company} value={company} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="branchName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('branchNameLabel')}</label>
        {currentUser?.role === Role.Manager ? (
          <div className="space-y-2">
            {!isAddingNewBranch ? (
                <select
                  name="branchName"
                  id="branchName"
                  value={product.branchName || ''}
                  onChange={(e) => {
                      if (e.target.value === 'ADD_NEW_BRANCH') {
                          setIsAddingNewBranch(true);
                          setProduct(prev => ({ ...prev, branchName: '' }));
                      } else {
                          handleChange(e);
                      }
                  }}
                  className={inputBaseClasses}
                >
                  {allOrganizationBranches.length === 0 && (
                      <option value="" disabled>{t('noBranchesAssigned') || 'No branches available'}</option>
                  )}
                  {allOrganizationBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                  <option value="ADD_NEW_BRANCH" className="font-bold text-sky-600">+ {t('addBranch') || 'Add New Branch'}</option>
                </select>
            ) : (
                <div className="flex gap-2">
                    <input
                      type="text"
                      name="branchName"
                      id="branchName"
                      value={product.branchName || ''}
                      onChange={handleChange}
                      className={inputBaseClasses}
                      placeholder={t('branchNameLabel') || 'Branch Name'}
                      autoFocus
                    />
                    {allOrganizationBranches.length > 0 && (
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsAddingNewBranch(false);
                                setProduct(prev => ({ ...prev, branchName: allOrganizationBranches[0] || '' }));
                            }}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 mt-1"
                        >
                            {t('cancel')}
                        </button>
                    )}
                </div>
            )}
          </div>
        ) : (
          <select
            name="branchName"
            id="branchName"
            value={product.branchName || ''}
            onChange={handleChange}
            className={inputBaseClasses}
          >
            {employeeBranches.length === 0 && !product.branchName && (
              <option value="" disabled>{t('noBranchesAssigned') || 'No branches assigned'}</option>
            )}
            {employeeBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
            {product.branchName && !employeeBranches.includes(product.branchName) && (
              <option value={product.branchName}>{product.branchName}</option>
            )}
          </select>
        )}
      </div>
       
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('codeLabel')}</label>
        <div className="mt-1 flex rounded-md shadow-sm relative">
           {direction === 'rtl' ? (
            <>
              <input type="text" name="code" id="code" value={product.code} onChange={handleChange} className={codeInputClassName} required />
              <button type="button" onClick={() => setIsInlineScannerOpen(!isInlineScannerOpen)} className={cameraButtonClassName}>
                {isSearchingProduct ? (
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CameraIcon className="w-5 h-5" />
                )}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setIsInlineScannerOpen(!isInlineScannerOpen)} className={cameraButtonClassName}>
                {isSearchingProduct ? (
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CameraIcon className="w-5 h-5" />
                )}
              </button>
              <input type="text" name="code" id="code" value={product.code} onChange={handleChange} className={codeInputClassName} required />
            </>
          )}
          {isSearchingProduct && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-[1px] flex items-center justify-center rounded-md z-10">
              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-700 rounded-full shadow-sm border border-slate-200 dark:border-slate-600">
                <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{t('searching') || 'Searching...'}</span>
              </div>
            </div>
          )}
        </div>
        {isInlineScannerOpen && (
          <BarcodeScanner 
            isInline={true} 
            onScanSuccess={handleInlineScanSuccess} 
            onClose={() => setIsInlineScannerOpen(false)} 
          />
        )}
      </div>
      
      <div>
          <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('expiryDateLabel')}</label>
          <div className="mt-1">
            <input
              type="date"
              name="expiryDate"
              id="expiryDate"
              value={product.expiryDate}
              onChange={handleChange}
              className={inputBaseClasses}
              required
            />
          </div>
      </div>

      <div className={`flex justify-end pt-4 space-x-2 ${direction === 'rtl' ? 'space-x-reverse' : ''}`}>
        <button
          type="button"
          onClick={onClose}
          className="bg-white dark:bg-slate-600 py-2 px-4 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
        >
          {t('saveProduct')}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;