import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductStatus, Role } from '../types';
import { getProductStatus, getStatusStyles, getDaysRemaining } from '../utils/productUtils';
import StatCard from './StatCard';
import { ProductsIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, PencilIcon, TrashIcon, PlusIcon, DownloadIcon, MagnifyingGlassIcon } from './Icons';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { LayoutGrid, List, BarChart3, PieChart as PieChartIcon, ArrowUpDown, CheckSquare, Square, Trash2 } from 'lucide-react';
import { exportProductsToExcel } from '../utils/excelExport';

interface DashboardProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onDeleteProducts: (productIds: string[]) => void;
  notificationDays: number;
}

const Dashboard: React.FC<DashboardProps> = ({ products, onAddProduct, onEditProduct, onDeleteProduct, onDeleteProducts, notificationDays }) => {
  const { t, direction } = useSettings();
  const { currentUser } = useAuth();
  const { playSound } = useSound();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'expiryDate' | 'company'>('expiryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [products]);
  
  const productStats = useMemo(() => {
    return products.reduce(
      (acc, p) => {
        const status = getProductStatus(p.expiryDate, notificationDays);
        if (status === ProductStatus.Expired) acc.expired++;
        else if (status === ProductStatus.NearExpiry) acc.nearExpiry++;
        else if (status === ProductStatus.Valid) acc.valid++;
        return acc;
      },
      { expired: 0, nearExpiry: 0, valid: 0 }
    );
  }, [products, notificationDays]);
  
  const productsWithStatus = useMemo(() => {
    return products.map(p => ({
      ...p,
      status: getProductStatus(p.expiryDate, notificationDays),
    }));
  }, [products, notificationDays]);

  const filteredProducts = useMemo(() => {
    return productsWithStatus.filter(p => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSearch = searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [productsWithStatus, statusFilter, searchTerm]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'company') comparison = (a.company || '').localeCompare(b.company || '');
      else if (sortBy === 'expiryDate') comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredProducts, sortBy, sortOrder]);
  
  const groupedProducts = useMemo(() => {
    const groups: Record<string, (Product & { status: ProductStatus })[]> = {};
    
    sortedProducts.forEach(product => {
      const companyName = product.company?.trim() || t('unknownCompany');
      if (!groups[companyName]) {
        groups[companyName] = [];
      }
      groups[companyName].push(product);
    });

    // If we are sorting by date, we might want to keep that order within groups
    // But currently groupedProducts is only used for the table view when NOT sorting by date?
    // Actually, groupedProducts is used for the table view.
    
    return groups;
  }, [sortedProducts, t]);


  const handleQuickFilterClick = (status: ProductStatus | 'all') => {
    setStatusFilter(prevStatus => prevStatus === status ? 'all' : status);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const chartData = [
    { name: t(ProductStatus.Valid), value: productStats.valid, color: '#10b981' },
    { name: t(ProductStatus.NearExpiry), value: productStats.nearExpiry, color: '#f59e0b' },
    { name: t(ProductStatus.Expired), value: productStats.expired, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showCharts, setShowCharts] = useState(true);

  const handleExportToStyledExcel = () => {
    const productsToExport = filteredProducts
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
    exportProductsToExcel(productsToExport, t, direction, notificationDays);
  };

  const statusRowClasses: Record<ProductStatus, string> = {
    [ProductStatus.Valid]: 'bg-green-50/50 hover:bg-green-100/60 dark:bg-green-900/10 dark:hover:bg-green-900/20',
    [ProductStatus.NearExpiry]: 'bg-yellow-50/50 hover:bg-yellow-100/60 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20',
    [ProductStatus.Expired]: 'bg-red-50/50 hover:bg-red-100/60 dark:bg-red-900/10 dark:hover:bg-red-900/20',
  }
  
  return (
    <div className="space-y-4 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display"
          >
            {t('dashboardTitle') || 'Dashboard'}
          </motion.h1>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
              onClick={() => {
                  playSound('click');
                  setShowCharts(!showCharts);
              }}
              className={`
                relative group p-2.5 rounded-xl border transition-all duration-300 overflow-hidden
                ${showCharts 
                  ? 'border-brand-500/50 text-white shadow-lg shadow-brand-500/25 ring-2 ring-brand-500/20' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400 hover:shadow-md'
                }
              `}
              title={t('toggleCharts') || 'Toggle Charts'}
           >
             {showCharts && (
               <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-brand-600 opacity-100 transition-opacity" />
             )}
             <div className="relative z-10">
               <BarChart3 className={`w-5 h-5 transition-transform duration-300 ${showCharts ? 'scale-110' : 'group-hover:scale-110'}`} strokeWidth={2.5} />
             </div>
           </button>
           <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>
           <button 
              onClick={() => {
                  playSound('click');
                  handleExportToStyledExcel();
              }} 
              className="group p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all active:scale-95 hover:shadow-md"
              title={t('exportExcelReport')}
           >
             <DownloadIcon className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={2.5} />
           </button>
           <button 
              onClick={() => {
                  playSound('click');
                  onAddProduct();
              }} 
              className="btn-primary hidden md:flex items-center gap-2"
           >
             <PlusIcon className="w-5 h-5" />
             <span className="hidden sm:inline">{t('addNewProduct')}</span>
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        <StatCard 
            title={t('allProducts')}
            value={products.length} 
            color="sky"
            icon={<ProductsIcon className="w-8 h-8" />}
            onClick={() => {
                playSound('click');
                handleQuickFilterClick('all');
            }}
            isActive={statusFilter === 'all'}
        />
        <StatCard 
            title={t('validProducts')} 
            value={productStats.valid} 
            color="green" 
            icon={<CheckCircleIcon className="w-8 h-8" />} 
            onClick={() => {
                playSound('click');
                handleQuickFilterClick(ProductStatus.Valid);
            }}
            isActive={statusFilter === ProductStatus.Valid}
        />
        <StatCard 
            title={t('nearExpiry')} 
            value={productStats.nearExpiry} 
            color="yellow" 
            icon={<ExclamationTriangleIcon className="w-8 h-8" />}
            onClick={() => {
                playSound('click');
                handleQuickFilterClick(ProductStatus.NearExpiry);
            }}
            isActive={statusFilter === ProductStatus.NearExpiry}
        />
        <StatCard 
            title={t('expiredProducts')} 
            value={productStats.expired} 
            color="red" 
            icon={<XCircleIcon className="w-8 h-8" />} 
            onClick={() => {
                playSound('click');
                handleQuickFilterClick(ProductStatus.Expired);
            }}
            isActive={statusFilter === ProductStatus.Expired}
        />
      </motion.div>

      {/* Charts Section */}
      <AnimatePresence>
        {showCharts && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {products.length > 0 ? (
              <div className="glass-card p-6 md:p-8 rounded-3xl mb-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('inventoryStatus') || 'Inventory Status'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('realtimeOverview') || 'Real-time overview of product expiration'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* Chart Column */}
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {chartData.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                              <stop offset="100%" stopColor={entry.color} stopOpacity={0.6}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={8}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} className="drop-shadow-xl" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '12px' }}
                          itemStyle={{ color: '#1e293b', fontWeight: 700, fontSize: '14px' }}
                          cursor={false}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-5xl font-black text-slate-900 dark:text-white font-display tracking-tight">{products.length}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('totalProducts') || 'Total Products'}</span>
                    </div>
                  </div>

                  {/* Stats Breakdown Column */}
                  <div className="space-y-6">
                    {chartData.map((item, index) => {
                      const percentage = Math.round((item.value / products.length) * 100);
                      return (
                        <div key={index} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shadow-lg shadow-current" style={{ backgroundColor: item.color }}></div>
                              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                              <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{percentage}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 rounded-2xl text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <BarChart3 className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">{t('noDataForCharts') || 'No Data Available'}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{t('addProductsToSeeCharts') || 'Add products to see statistics and insights.'}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="glass-card p-1.5 rounded-xl flex flex-col md:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <div className={`absolute inset-y-0 flex items-center pointer-events-none ${direction === 'rtl' ? 'right-3' : 'left-3'}`}>
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder={t('searchProductsDashboard')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`w-full py-2 px-10 bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 placeholder-slate-400 text-sm`}
          />
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg w-full md:w-auto">
          <div className="flex items-center px-2 gap-2 border-r border-slate-200 dark:border-slate-700 mr-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t('sortBy')}:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer py-1 pl-0 pr-6"
            >
              <option value="expiryDate">{t('date')}</option>
              <option value="name">{t('name')}</option>
              <option value="company">{t('company')}</option>
            </select>
            <button 
              onClick={() => {
                  playSound('click');
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              }}
              className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all text-slate-500"
            >
              <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <button 
            onClick={() => {
                playSound('click');
                setViewMode('table');
            }}
            className={`flex-1 md:flex-none p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-600' : 'text-slate-500'}`}
          >
            <List className="w-5 h-5 mx-auto" />
          </button>
          <button 
            onClick={() => {
                playSound('click');
                setViewMode('grid');
            }}
            className={`flex-1 md:flex-none p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-600' : 'text-slate-500'}`}
          >
            <LayoutGrid className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </div>
      
      {/* Products Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('productsList')}</h2>
           <div className="flex items-center gap-2">
             <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('total') || 'Total'}:</span>
             <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 py-0.5 px-2.5 rounded-full text-xs font-bold">
                 {filteredProducts.length}
             </span>
           </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {viewMode === 'table' ? (
            /* Desktop Table View */
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                    <th className="px-4 py-2 w-10">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-brand-500 transition-colors">
                        {selectedIds.length === sortedProducts.length && sortedProducts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-brand-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    {[t('productName'), t('companyName'), t('branchName'), t('code'), t('expiryDate'), t('daysRemaining'), t('status'), t('actions')].map(header => (
                        <th key={header} scope="col" className={`px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                        {header}
                        </th>
                    ))}
                    </tr>
                </thead>
                {Object.keys(groupedProducts).sort().map(companyName => (
                    <tbody key={companyName} className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        <tr className="bg-slate-50/30 dark:bg-slate-900/20">
                            <th colSpan={9} className={`px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-brand-500 opacity-50">#</span>
                                    {companyName}
                                    <span className="font-medium text-slate-300 dark:text-slate-600">
                                      {groupedProducts[companyName].length}
                                    </span>
                                </div>
                            </th>
                        </tr>
                        {groupedProducts[companyName].map(product => {
                            const { badge } = getStatusStyles(product.status);
                            const rowClass = statusRowClasses[product.status];
                            return (
                                <motion.tr 
                                  layout
                                  key={product.id} 
                                  className={`${rowClass} transition-colors duration-200 ${selectedIds.includes(product.id) ? 'ring-1 ring-inset ring-brand-500 bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
                                >
                                    <td className="px-4 py-2">
                                      <button onClick={() => {
                                          playSound('click');
                                          toggleSelectProduct(product.id);
                                      }} className="text-slate-400 hover:text-brand-500 transition-colors">
                                        {selectedIds.includes(product.id) ? (
                                          <CheckSquare className="w-4 h-4 text-brand-500" />
                                        ) : (
                                          <Square className="w-4 h-4" />
                                        )}
                                      </button>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-200">{product.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{product.company || t('unknown')}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{product.branchName || '-'}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-[10px] font-mono text-slate-400">{product.code}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">{product.expiryDate}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                                      {(() => {
                                        const days = getDaysRemaining(product.expiryDate);
                                        return (
                                          <span className={`font-bold ${days < 0 ? 'text-red-500' : days <= notificationDays ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {days < 0 ? t('ProductStatus.Expired') : days}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                                        <span className={`px-2 py-0.5 inline-flex items-center gap-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${badge}`}>
                                            <div className="w-1 h-1 rounded-full bg-current"></div>
                                            {t(product.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs font-medium">
                                        <div className={`flex items-center gap-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <button onClick={() => {
                                                playSound('click');
                                                onEditProduct(product);
                                            }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all"><PencilIcon className="w-3.5 h-3.5" /></button>
                                            {currentUser?.role !== Role.Employee && (
                                              <button onClick={() => {
                                                  playSound('click');
                                                  onDeleteProduct(product.id);
                                              }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                ))}
                </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {sortedProducts.map(product => {
                  const { badge } = getStatusStyles(product.status);
                  return (
                    <motion.div 
                      layout
                      key={product.id}
                      className={`glass-card p-3 rounded-xl relative overflow-hidden group hover:shadow-xl hover:shadow-brand-500/5 transition-all ${selectedIds.includes(product.id) ? 'ring-2 ring-brand-500' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSelectProduct(product.id)} className="text-slate-400 hover:text-brand-500 transition-colors">
                            {selectedIds.includes(product.id) ? (
                              <CheckSquare className="w-4 h-4 text-brand-500" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${badge}`}>
                            {t(product.status)}
                          </div>
                        </div>
                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                              playSound('click');
                              onEditProduct(product);
                          }} className="p-1 text-slate-400 hover:text-brand-600 bg-white/50 dark:bg-slate-800/50 rounded-lg"><PencilIcon className="w-3.5 h-3.5" /></button>
                          {currentUser?.role !== Role.Employee && (
                            <button onClick={() => {
                                playSound('click');
                                onDeleteProduct(product.id);
                            }} className="p-1 text-slate-400 hover:text-red-600 bg-white/50 dark:bg-slate-800/50 rounded-lg"><TrashIcon className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">{product.name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{product.company || t('unknown')}</p>
                      
                      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t('expiryDate')}</span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{product.expiryDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t('daysRemaining')}</span>
                          <span className={`text-sm font-bold ${getDaysRemaining(product.expiryDate) < 0 ? 'text-red-500' : getDaysRemaining(product.expiryDate) <= notificationDays ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {getDaysRemaining(product.expiryDate) < 0 ? '!' : getDaysRemaining(product.expiryDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t('branchName')}</span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate block">{product.branchName || '-'}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
               })}
            </div>
          )}
        </div>

        {/* Mobile Card View (Only visible on mobile when viewMode is table) */}
        {viewMode === 'table' && (
          <div className="md:hidden space-y-6">
              {Object.keys(groupedProducts).sort().map(companyName => (
                <div key={companyName} className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{companyName}</h3>
                        <span className="text-xs font-bold text-brand-600 bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-0.5 rounded-full">
                            {groupedProducts[companyName].length}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {groupedProducts[companyName].map(product => {
                            const { badge } = getStatusStyles(product.status);
                            const rowClass = statusRowClasses[product.status];
                            return (
                                <div key={product.id} className={`glass-card p-4 rounded-2xl relative overflow-hidden ${rowClass} ${selectedIds.includes(product.id) ? 'ring-2 ring-brand-500' : 'border border-slate-200/50 dark:border-slate-700/50'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-3">
                                            <button onClick={() => toggleSelectProduct(product.id)} className="mt-0.5 text-slate-400 hover:text-brand-500 transition-colors">
                                              {selectedIds.includes(product.id) ? (
                                                <CheckSquare className="w-5 h-5 text-brand-500" />
                                              ) : (
                                                <Square className="w-5 h-5" />
                                              )}
                                            </button>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{product.name}</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded">{product.code}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs font-bold rounded-lg uppercase tracking-wider ${badge}`}>
                                            {t(product.status)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-4 bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('branchName')}</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">{product.branchName || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('expiryDate')}</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{product.expiryDate}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('daysRemaining')}</span>
                                            <span className={`text-xs font-bold ${getDaysRemaining(product.expiryDate) < 0 ? 'text-red-500' : getDaysRemaining(product.expiryDate) <= notificationDays ? 'text-amber-500' : 'text-emerald-500'}`}>
                                              {getDaysRemaining(product.expiryDate) < 0 ? t('ProductStatus.Expired') : getDaysRemaining(product.expiryDate)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                        <button onClick={() => {
                                            playSound('click');
                                            onEditProduct(product);
                                        }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all active:scale-95">
                                            <PencilIcon className="w-3.5 h-3.5" /> {t('edit')}
                                        </button>
                                        {currentUser?.role !== Role.Employee && (
                                            <button onClick={() => {
                                                playSound('click');
                                                onDeleteProduct(product.id);
                                            }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all active:scale-95">
                                                <TrashIcon className="w-3.5 h-3.5" /> {t('delete')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
          </div>
        )}

         {Object.keys(groupedProducts).length === 0 && (
            <div className="p-4">
                 <div className="text-center py-12 px-6 bg-white dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 animate-fadeIn">
                    <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <MagnifyingGlassIcon className="w-8 h-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {searchTerm || statusFilter !== 'all' ? t('noProductsFound') : t('noProductsTitle')}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                         {searchTerm || statusFilter !== 'all' ? t('tryDifferentKeywords') : t('noProductsMessage')}
                    </p>
                    {(!searchTerm && products.length === 0) && (
                        <div className="mt-6">
                            <button onClick={onAddProduct} className="flex items-center mx-auto justify-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-all duration-200 active:scale-95">
                                <PlusIcon />
                                {t('addNewProduct')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
         )}
      </div>
      {/* Floating Add Product Button */}
      <AnimatePresence>
        {selectedIds.length === 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
                playSound('click');
                onAddProduct();
            }}
            className={`fixed bottom-24 ${direction === 'rtl' ? 'left-6' : 'right-6'} z-40 w-14 h-14 bg-brand-600 text-white rounded-full shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all duration-300 flex items-center justify-center md:hidden`}
            aria-label={t('addNewProduct')}
          >
            <PlusIcon className="w-8 h-8" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-4">
                <button onClick={() => {
                    playSound('click');
                    setSelectedIds([]);
                }} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                  <XCircleIcon className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold uppercase tracking-widest">{t('selectedCount', { count: selectedIds.length })}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    playSound('click');
                    onDeleteProducts(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteSelected')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;