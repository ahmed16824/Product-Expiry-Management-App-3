import React, { useMemo } from 'react';
import { Product, ProductStatus } from '../types';
import { getProductStatus } from '../utils/productUtils';
import { DownloadIcon } from './Icons';
import { useSettings } from '../context/SettingsContext';

interface ReportsProps {
  products: Product[];
}

const Reports: React.FC<ReportsProps> = ({ products }) => {
  const { t, notificationDays } = useSettings();

  const { expiredProducts, nearExpiryProducts, allProducts } = useMemo(() => {
    const expired: Product[] = [];
    const nearExpiry: Product[] = [];
    products.forEach(p => {
      const status = getProductStatus(p.expiryDate, notificationDays);
      if (status === ProductStatus.Expired) {
        expired.push(p);
      } else if (status === ProductStatus.NearExpiry) {
        nearExpiry.push(p);
      }
    });
    // Sort by expiry date, most recent first for expired, and closest first for near expiry
    expired.sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
    nearExpiry.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
    // Sort all products by expiry date
    const all = [...products].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    return { expiredProducts: expired, nearExpiryProducts: nearExpiry, allProducts: all };
  }, [products, notificationDays]);
  
  const exportToCSV = (data: Product[], filename: string) => {
    if (data.length === 0) return;
    const headers = [t("productName"), t("companyName"), t("branchName"), t("code"), t("expiryDate")];
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.company || '').replace(/"/g, '""')}"`,
        `"${(item.branchName || '').replace(/"/g, '""')}"`,
        item.code,
        item.expiryDate
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const ReportSection = ({ title, data, filenamePrefix, rowColorClass }: { title: string; data: Product[]; filenamePrefix: string; rowColorClass: string }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{title} ({data.length})</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('exportProductListDesc')}</p>
        </div>
        <div className="mt-2 sm:mt-0 flex space-x-2 space-x-reverse">
          <button 
            onClick={() => exportToCSV(data, `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 transition-colors"
            disabled={data.length === 0}
          >
            <DownloadIcon />
            {t('exportCSV')}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto border-t dark:border-slate-700 pt-4">
        {data.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {[t("productName"), t("companyName"), t("branchName"), t("code"), t("expiryDate")].map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {data.map(product => (
                <tr key={product.id} className={`${rowColorClass} hover:bg-slate-50 dark:hover:bg-slate-700/50`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{product.company || t('unknown')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{product.branchName || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{product.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{product.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('noProductsToDisplay')}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('reportsTitle')}</h1>
      <ReportSection 
        title={t('allProductsReportTitle') || 'All Products Report'} 
        data={allProducts} 
        filenamePrefix="all_products"
        rowColorClass="bg-white dark:bg-slate-800"
      />
      <ReportSection 
        title={t('expiredProductsReportTitle')} 
        data={expiredProducts} 
        filenamePrefix="expired_products"
        rowColorClass="bg-red-50/50 dark:bg-red-900/10"
      />
      <ReportSection 
        title={t('nearExpiryProductsReportTitle')} 
        data={nearExpiryProducts} 
        filenamePrefix="near_expiry_products"
        rowColorClass="bg-yellow-50/50 dark:bg-yellow-900/10"
      />
    </div>
  );
};

export default Reports;