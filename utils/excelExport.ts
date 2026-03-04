import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Product, ProductStatus, ScannableProduct } from '../types';

export const exportProductsToExcel = async (
  products: (Product & { status: ProductStatus })[],
  t: (key: string, params?: any) => string,
  direction: 'rtl' | 'ltr',
  notificationDays: number
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('excelReportTitle'), {
    views: [{ rightToLeft: direction === 'rtl' }],
  });

  // Set default font
  worksheet.properties.defaultRowHeight = 20;

  // Add Title
  const titleRow = worksheet.addRow([t('excelReportTitle')]);
  titleRow.height = 30;
  worksheet.mergeCells(1, 1, 1, 6);
  titleRow.getCell(1).font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0D9488' } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Add Date
  const dateStr = new Date().toLocaleDateString(direction === 'rtl' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateRow = worksheet.addRow([t('excelExportDate', { date: dateStr })]);
  dateRow.height = 20;
  worksheet.mergeCells(2, 1, 2, 6);
  dateRow.getCell(1).font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
  dateRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.addRow([]); // Empty row

  // Headers
  const headers = [
    t("productName"),
    t("companyName"),
    t("branchName"),
    t("code"),
    t("expiryDate"),
    t("status")
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0891B2' },
    };
    cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data
  products.forEach((p) => {
    const row = worksheet.addRow([
      p.name,
      p.company || '',
      p.branchName || '',
      p.code,
      p.expiryDate,
      t(p.status)
    ]);

    // Style data cells
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 11 };
      cell.alignment = { horizontal: colNumber === 1 ? (direction === 'rtl' ? 'right' : 'left') : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Status column styling
      if (colNumber === 6) {
        let bgColor = 'FFFFFFFF';
        let textColor = 'FF000000';

        if (p.status === ProductStatus.Expired) {
          bgColor = 'FFFFE4E1'; // Light Coral
          textColor = 'FFB91C1C';
        } else if (p.status === ProductStatus.NearExpiry) {
          bgColor = 'FFFFF9C4'; // Light Yellow
          textColor = 'FFB45309';
        } else if (p.status === ProductStatus.Valid) {
          bgColor = 'FFDCFCE7'; // Light Green
          textColor = 'FF15803D';
        }

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.font = { ...cell.font, color: { argb: textColor }, bold: true };
      }
    });
  });

  // Column widths
  worksheet.getColumn(1).width = 35; // Name
  worksheet.getColumn(2).width = 25; // Company
  worksheet.getColumn(3).width = 20; // Branch
  worksheet.getColumn(4).width = 20; // Code
  worksheet.getColumn(5).width = 15; // Expiry
  worksheet.getColumn(6).width = 15; // Status

  // Generate buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportDatabaseToExcel = async (
  products: ScannableProduct[],
  companyName: string,
  t: (key: string) => string,
  direction: 'rtl' | 'ltr'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(t('productDatabase'), {
    views: [{ rightToLeft: direction === 'rtl' }],
  });

  // Headers
  const headers = [t("productName"), t("companyName"), t("code")];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0891B2' },
    };
    cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Data
  products.forEach((p) => {
    const row = worksheet.addRow([p.name, p.company || '', p.code]);
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  worksheet.getColumn(1).width = 40;
  worksheet.getColumn(2).width = 30;
  worksheet.getColumn(3).width = 25;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeCompanyName = companyName.replace(/[^a-z0-9]/gi, '_');
  saveAs(blob, `${safeCompanyName}_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const downloadTemplateExcel = async (
  t: (key: string) => string,
  direction: 'rtl' | 'ltr',
  selectedCompany?: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template', {
    views: [{ rightToLeft: direction === 'rtl' }],
  });

  // Headers
  const headers = [t("productName"), t("code"), t("companyName")];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Indigo
    };
    cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Example Row
  const exampleRow = worksheet.addRow([
    direction === 'rtl' ? "مثال: عصير برتقال" : "Example: Orange Juice",
    "1234567890123",
    selectedCompany || (direction === 'rtl' ? "اسم الشركة" : "Company Name")
  ]);
  exampleRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    cell.alignment = { vertical: 'middle' };
  });

  worksheet.getColumn(1).width = 40;
  worksheet.getColumn(2).width = 25;
  worksheet.getColumn(3).width = 30;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Products_Template.xlsx`);
};
