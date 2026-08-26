'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

type AdminTab = 'upload' | 'manage' | 'subscribers' | 'suggestions';

interface LiveCompany {
  id: string;
  name: string;
  ticker: string;
  country: string;
  sector: string;
  created_at: string;
  financial_statements?: { count: number }[];
}

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
}

interface CompanyRequest {
  id: string;
  company_name: string;
  country: string;
  email: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('upload');

  // Dynamic States
  const [liveCompanies, setLiveCompanies] = useState<LiveCompany[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [companyRequests, setCompanyRequests] = useState<CompanyRequest[]>([]);

  // Loading States
  const [isLoadingManage, setIsLoadingManage] = useState(false);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Row Action Loading States
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [isReplacingId, setIsReplacingId] = useState<string | null>(null);

  // Replace File Input Ref
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetCompany, setReplaceTargetCompany] = useState<LiveCompany | null>(null);

  // Form input states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCompany, setTargetCompany] = useState('CBZ Holdings');
  const [targetTicker, setTargetTicker] = useState('CBZ.zw');
  const [targetCountry, setTargetCountry] = useState('Zimbabwe');
  const [targetSector, setTargetSector] = useState('Banking & Financial Services');
  
  // Status & loading states
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Live Datasets
  const fetchLiveDatasets = async () => {
    setIsLoadingManage(true);
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        ticker,
        country,
        sector,
        created_at,
        financial_statements(count)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLiveCompanies(data as unknown as LiveCompany[]);
    }
    setIsLoadingManage(false);
  };

  // Fetch Subscribers
  const fetchSubscribers = async () => {
    setIsLoadingSubscribers(true);
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubscribers(data);
    }
    setIsLoadingSubscribers(false);
  };

  // Fetch Company Requests
  const fetchCompanyRequests = async () => {
    setIsLoadingRequests(true);
    const { data, error } = await supabase
      .from('company_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCompanyRequests(data);
    }
    setIsLoadingRequests(false);
  };

  useEffect(() => {
    fetchLiveDatasets();
    fetchSubscribers();
    fetchCompanyRequests();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  // Helper: Detect Tab Types for all 8 categories
  const detectSheetType = (sheetName: string): string | null => {
    const name = sheetName.toLowerCase().replace(/[^a-z0-9&]/g, '');

    if (name.includes('info') || name.includes('overview') || name.includes('profile') || name.includes('company')) return 'info';
    if (name.includes('director') || name.includes('management') || name.includes('board') || name.includes('executive')) return 'management';
    if (name.includes('pnl') || name.includes('p&l') || name.includes('income') || name.includes('profit')) return 'pnl';
    if (name.includes('bs') || name.includes('sofp') || name.includes('balance') || name.includes('position')) return 'bs';
    if (name.includes('cf') || name.includes('socf') || name.includes('cash') || name.includes('flow')) return 'cf';
    if (name.includes('soce') || name.includes('equity') || name.includes('change')) return 'soce';
    if (name.includes('ratio') || name.includes('metrics') || name.includes('kpi')) return 'ratios';
    if (name.includes('shareholding') || name.includes('shareholder') || name.includes('ownership')) return 'shareholding';

    return null;
  };

  // Helper: Extract Year from Header Cell
  const extractYear = (cellVal: any): string | null => {
    if (cellVal === null || cellVal === undefined) return null;
    const str = String(cellVal).trim();
    const match4 = str.match(/\b(20[1-3]\d)\b/);
    if (match4) return match4[1];
    const match2 = str.match(/\bFY\s*([1-3]\d)\b/i);
    if (match2) return `20${match2[1]}`;
    return null;
  };

  // Helper: Convert Financial Number Formats
  const parseFinancialNumber = (val: any): { numeric: number; formatted: string } => {
    if (val === null || val === undefined || val === '') return { numeric: 0, formatted: '-' };
    const strVal = String(val).trim();

    if (typeof val === 'number') {
      return { numeric: isNaN(val) ? 0 : val, formatted: strVal };
    }

    if (!strVal || strVal === '-' || strVal === '—' || strVal === 'N/A') return { numeric: 0, formatted: '-' };

    const isParenthesesNegative = /^\((.*)\)$/.test(strVal);
    let cleanStr = strVal;
    if (isParenthesesNegative) {
      cleanStr = cleanStr.replace(/^\((.*)\)$/, '$1');
    }

    cleanStr = cleanStr.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);

    if (isNaN(num)) return { numeric: 0, formatted: strVal };
    const numeric = isParenthesesNegative ? -Math.abs(num) : num;
    return { numeric, formatted: strVal };
  };

  // Parsing & Ingestion Core Function
  const parseAndUploadWorkbook = async (
    file: File,
    companyDetails: { name: string; ticker: string; country: string; sector: string; id?: string }
  ) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    let companyId = companyDetails.id;

    if (!companyId) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', companyDetails.name)
        .maybeSingle();

      companyId = existingCompany?.id;

      if (!companyId) {
        const { data: newCompany, error: createErr } = await supabase
          .from('companies')
          .insert({
            name: companyDetails.name,
            ticker: companyDetails.ticker,
            country: companyDetails.country,
            sector: companyDetails.sector,
            currency: 'USD / ZWG',
          })
          .select('id')
          .single();

        if (createErr) throw new Error(`Failed to create company: ${createErr.message}`);
        companyId = newCompany.id;
      }
    }

    // Collections to insert across tables
    const infoEntries: Array<{ company_id: string; field_label: string; field_value: string }> = [];
    const mgmtEntries: Array<{ company_id: string; person_name: string; role_title: string; category: string }> = [];
    const shareholderEntries: Array<{ company_id: string; shareholder_name: string; shares_count: string; percentage: string }> = [];
    const statementEntries: Array<{
      company_id: string;
      statement_type: string;
      line_item: string;
      fiscal_year: string;
      amount: number;
      amount_text: string;
      is_header: boolean;
      is_total: boolean;
      indent: boolean;
    }> = [];

    const parsedTabs: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const tabType = detectSheetType(sheetName);
      if (!tabType) continue;

      const worksheet = workbook.Sheets[sheetName];
      const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonRows.length < 1) continue;

      parsedTabs.push(`${sheetName} ➔ [${tabType.toUpperCase()}]`);

      // 1. Company Info Parser (Key/Value pairs)
      if (tabType === 'info') {
        for (const row of jsonRows) {
          if (!row || row.length < 2) continue;
          const label = String(row[0] || '').trim();
          const val = String(row[1] || '').trim();
          if (label && val) {
            infoEntries.push({ company_id: companyId, field_label: label, field_value: val });
          }
        }
        continue;
      }

      // 2. Directors & Management Parser
      if (tabType === 'management') {
        for (let r = 1; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row || !row[0]) continue;
          const person = String(row[0] || '').trim();
          const role = String(row[1] || '').trim();
          const cat = String(row[2] || 'Board / Executive').trim();
          if (person) {
            mgmtEntries.push({ company_id: companyId, person_name: person, role_title: role || 'Director', category: cat });
          }
        }
        continue;
      }

      // 3. Shareholding Parser
      if (tabType === 'shareholding') {
        for (let r = 1; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row || !row[0]) continue;
          const name = String(row[0] || '').trim();
          const shares = String(row[1] || '-').trim();
          const pct = String(row[2] || '-').trim();
          if (name) {
            shareholderEntries.push({ company_id: companyId, shareholder_name: name, shares_count: shares, percentage: pct });
          }
        }
        continue;
      }

      // 4. Multi-Year Financial Statements & Ratios Parser (pnl, bs, cf, soce, ratios)
      let headerRowIndex = -1;
      let yearColumns: Array<{ year: string; colIndex: number }> = [];

      for (let i = 0; i < Math.min(jsonRows.length, 15); i++) {
        const row = jsonRows[i];
        if (!row || !Array.isArray(row)) continue;

        const foundYears: Array<{ year: string; colIndex: number }> = [];
        row.forEach((cell: any, colIdx: number) => {
          const yr = extractYear(cell);
          if (yr) {
            foundYears.push({ year: yr, colIndex: colIdx });
          }
        });

        if (foundYears.length > yearColumns.length) {
          yearColumns = foundYears;
          headerRowIndex = i;
        }
      }

      if (yearColumns.length === 0) continue;
      const firstYearColIndex = Math.min(...yearColumns.map((y) => y.colIndex));

      for (let r = headerRowIndex + 1; r < jsonRows.length; r++) {
        const row = jsonRows[r];
        if (!row || !Array.isArray(row)) continue;

        let rawLabel = '';
        for (let c = 0; c < firstYearColIndex; c++) {
          const cellText = String(row[c] || '').trim();
          if (cellText && isNaN(Number(cellText)) && cellText.length > rawLabel.length) {
            rawLabel = cellText;
          }
        }

        if (!rawLabel) continue;

        const isHeader = rawLabel.toUpperCase() === rawLabel && !row.some((val: any, i: number) => i >= firstYearColIndex && val !== '' && val !== null);
        const isTotal = rawLabel.toLowerCase().includes('total') || rawLabel.toLowerCase().includes('profit') || rawLabel.toLowerCase().includes('net');
        const indent = String(row[0] || '').startsWith(' ') || String(row[0] || '').startsWith('\t');

        yearColumns.forEach(({ year, colIndex }) => {
          const rawVal = row[colIndex];
          const parsed = parseFinancialNumber(rawVal);

          statementEntries.push({
            company_id: companyId,
            statement_type: tabType,
            line_item: rawLabel,
            fiscal_year: year,
            amount: parsed.numeric,
            amount_text: parsed.formatted,
            is_header: isHeader,
            is_total: isTotal,
            indent,
          });
        });
      }
    }

    // Clear old records for clean update
    await supabase.from('company_info_items').delete().eq('company_id', companyId);
    await supabase.from('directors_management').delete().eq('company_id', companyId);
    await supabase.from('shareholders').delete().eq('company_id', companyId);
    await supabase.from('financial_statements').delete().eq('company_id', companyId);

    // Insert new records into respective tables
    if (infoEntries.length > 0) await supabase.from('company_info_items').insert(infoEntries);
    if (mgmtEntries.length > 0) await supabase.from('directors_management').insert(mgmtEntries);
    if (shareholderEntries.length > 0) await supabase.from('shareholders').insert(shareholderEntries);
    if (statementEntries.length > 0) await supabase.from('financial_statements').insert(statementEntries);

    const totalUploaded = infoEntries.length + mgmtEntries.length + shareholderEntries.length + statementEntries.length;
    if (totalUploaded === 0) {
      throw new Error(`Could not extract data from "${file.name}". Ensure tabs match Info, Directors, P&L, BS, CF, SOCE, Ratios, or Shareholding.`);
    }

    return { companyId, totalUploaded, parsedTabs };
  };

  // Form Upload Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const res = await parseAndUploadWorkbook(selectedFile, {
        name: targetCompany,
        ticker: targetTicker,
        country: targetCountry,
        sector: targetSector,
      });

      setUploadStatus({
        message: `Successfully uploaded ${selectedFile.name} for ${targetCompany}! Uploaded ${res.totalUploaded} records across detected tabs.`,
      });
      setSelectedFile(null);
      fetchLiveDatasets();
    } catch (err: any) {
      setUploadStatus({
        message: err.message || 'An error occurred during upload.',
        isError: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Replace Dataset Handler
  const handleTriggerReplace = (company: LiveCompany) => {
    setReplaceTargetCompany(company);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !replaceTargetCompany) return;

    const file = e.target.files[0];
    setIsReplacingId(replaceTargetCompany.id);

    try {
      const res = await parseAndUploadWorkbook(file, {
        id: replaceTargetCompany.id,
        name: replaceTargetCompany.name,
        ticker: replaceTargetCompany.ticker,
        country: replaceTargetCompany.country,
        sector: replaceTargetCompany.sector,
      });

      alert(`Successfully replaced dataset for ${replaceTargetCompany.name}! Updated with ${res.totalUploaded} records.`);
      fetchLiveDatasets();
    } catch (err: any) {
      alert(`Replace failed: ${err.message}`);
    } finally {
      setIsReplacingId(null);
      setReplaceTargetCompany(null);
    }
  };

  // Download Dataset Handler
  const handleDownloadCompany = async (company: LiveCompany) => {
    setIsDownloadingId(company.id);

    try {
      const workbook = XLSX.utils.book_new();

      // Fetch financial statements & ratios
      const { data: statements } = await supabase.from('financial_statements').select('*').eq('company_id', company.id);

      if (statements && statements.length > 0) {
        const tabNames: Record<string, string> = {
          pnl: 'P&L',
          bs: 'Balance Sheet',
          cf: 'Cash Flow',
          soce: 'SOCE',
          ratios: 'Ratios',
        };

        Object.keys(tabNames).forEach((stmtType) => {
          const stmtRows = statements.filter((s) => s.statement_type.toLowerCase() === stmtType);
          if (stmtRows.length === 0) return;

          const years = Array.from(new Set(stmtRows.map((s) => s.fiscal_year))).sort();

          const lineItemMap = new Map<string, Record<string, string>>();
          stmtRows.forEach((s) => {
            if (!lineItemMap.has(s.line_item)) lineItemMap.set(s.line_item, {});
            lineItemMap.get(s.line_item)![s.fiscal_year] = s.amount_text || String(s.amount);
          });

          const sheetData: any[][] = [];
          sheetData.push(['Line Item', ...years.map((y) => `FY ${y}`)]);

          lineItemMap.forEach((yearVals, label) => {
            const row = [label, ...years.map((y) => yearVals[y] ?? '')];
            sheetData.push(row);
          });

          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, worksheet, tabNames[stmtType]);
        });
      }

      const safeName = company.name.replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(workbook, `${safeName}_Financial_Spreads.xlsx`);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsDownloadingId(null);
    }
  };

  // Delete Dataset Handler
  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${companyName} and all its data from Supabase?`)) {
      return;
    }

    setIsDeletingId(companyId);

    try {
      await supabase.from('company_info_items').delete().eq('company_id', companyId);
      await supabase.from('directors_management').delete().eq('company_id', companyId);
      await supabase.from('shareholders').delete().eq('company_id', companyId);
      await supabase.from('financial_statements').delete().eq('company_id', companyId);
      const { error } = await supabase.from('companies').delete().eq('id', companyId);

      if (error) throw error;

      setLiveCompanies((prev) => prev.filter((c) => c.id !== companyId));
    } catch (err: any) {
      alert(`Error deleting company: ${err.message}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Toggle Company Request Status
  const toggleRequestStatus = async (id: string, currentStatus: CompanyRequest['status']) => {
    const nextStatus: CompanyRequest['status'] =
      currentStatus === 'Pending' ? 'In Progress' : currentStatus === 'In Progress' ? 'Completed' : 'Pending';

    setCompanyRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
    );

    await supabase.from('company_requests').update({ status: nextStatus }).eq('id', id);
  };

  return (
    <div className="min-h-screen bg-white text-[#1E2430] flex flex-col font-sans">
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileSelected}
        className="hidden"
      />

      {/* Header */}
      <header className="border-b border-gray-200 bg-[#273142] text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-white tracking-tight">
            Afri<span className="text-[#2F6FED]">Datar</span>
          </Link>
          <span className="text-xs bg-[#2F6FED] text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
            Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/data" className="text-gray-300 hover:text-white transition-colors">
            View Data Library
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            Exit Admin
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            📊 Upload Excel Spreads
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'manage'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            🗂️ Manage Live Datasets ({liveCompanies.length})
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'subscribers'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            📬 Subscribers ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'suggestions'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            💡 Company Requests ({companyRequests.length})
          </button>
        </div>

        {/* TAB 1: EXCEL UPLOAD */}
        {activeTab === 'upload' && (
          <div className="bg-[#F8FAFC] border border-gray-200 p-6 rounded-xl max-w-2xl shadow-sm">
            <h2 className="text-xl font-bold text-[#1E2430] mb-1">Import Multi-Tab Excel Spreads</h2>
            <p className="text-xs text-[#667085] mb-6">
              Supported Excel tabs: <code className="text-[#0F8B8D]">Company Info</code>, <code className="text-[#0F8B8D]">Directors</code>, <code className="text-[#0F8B8D]">P&L</code>, <code className="text-[#0F8B8D]">BS</code>, <code className="text-[#0F8B8D]">CF</code>, <code className="text-[#0F8B8D]">SOCE</code>, <code className="text-[#0F8B8D]">Ratios</code>, <code className="text-[#0F8B8D]">Shareholding</code>.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#667085] block mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#667085] block mb-1">Ticker Symbol</label>
                  <input
                    type="text"
                    required
                    value={targetTicker}
                    onChange={(e) => setTargetTicker(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#667085] block mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#667085] block mb-1">Sector</label>
                  <input
                    type="text"
                    required
                    value={targetSector}
                    onChange={(e) => setTargetSector(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div>
                <label className="text-xs font-semibold text-[#667085] block mb-1">Excel Workbook (.xlsx)</label>
                <div className="border-2 border-dashed border-gray-300 hover:border-[#0F8B8D] bg-white rounded-lg p-6 text-center transition-colors">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <span className="text-3xl">📁</span>
                    <span className="text-xs text-[#1E2430] font-medium">
                      {selectedFile ? selectedFile.name : 'Click to select or drag and drop Excel file'}
                    </span>
                    <span className="text-[10px] text-[#667085]">Automatically inserts into 8 core tabs</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className={`w-full py-2.5 rounded-md font-semibold text-xs transition-colors ${
                  !selectedFile || isUploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#0F8B8D] hover:bg-[#0c7274] text-white shadow-sm'
                }`}
              >
                {isUploading ? 'Parsing & Uploading to Supabase...' : 'Upload & Publish to Database'}
              </button>
            </form>

            {uploadStatus && (
              <div
                className={`mt-4 p-3 rounded text-xs font-medium border whitespace-pre-wrap ${
                  uploadStatus.isError
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-[#0F8B8D]/15 text-[#0F8B8D] border-[#0F8B8D]/30'
                }`}
              >
                {uploadStatus.message}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE LIVE DATASETS */}
        {activeTab === 'manage' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h2 className="text-sm font-bold text-[#1E2430]">Live Companies & Financial Datasets</h2>
                <p className="text-[11px] text-[#667085]">Companies currently published on the public /data page</p>
              </div>
              <button
                onClick={fetchLiveDatasets}
                className="text-xs text-[#2F6FED] hover:underline font-semibold"
              >
                ↻ Refresh List
              </button>
            </div>

            {isLoadingManage ? (
              <div className="p-8 text-center text-xs text-[#667085]">Loading live datasets...</div>
            ) : liveCompanies.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#667085]">
                No live datasets found in Supabase. Upload an Excel file in the Upload tab to publish data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-[#F1F5F9] text-xs font-semibold text-[#273142] border-b border-gray-200">
                      <th className="p-3">Company</th>
                      <th className="p-3">Country / Sector</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Last Updated</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {liveCompanies.map((comp) => {
                      const formattedDate = new Date(comp.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={comp.id} className="hover:bg-gray-50 text-[#273142]">
                          <td className="p-3">
                            <span className="font-bold text-[#1E2430] block">{comp.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{comp.ticker}</span>
                          </td>
                          <td className="p-3 text-[#667085]">
                            <div>{comp.country}</div>
                            <div className="text-[10px] text-gray-400">{comp.sector}</div>
                          </td>
                          <td className="p-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#0F8B8D]/15 text-[#0F8B8D] border border-[#0F8B8D]/30">
                              ● LIVE
                            </span>
                          </td>
                          <td className="p-3 text-[#667085]">{formattedDate}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownloadCompany(comp)}
                                disabled={isDownloadingId === comp.id}
                                className="bg-blue-50 hover:bg-blue-100 text-[#2F6FED] border border-blue-200 px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {isDownloadingId === comp.id ? 'Exporting...' : '📥 Download'}
                              </button>
                              <button
                                onClick={() => handleTriggerReplace(comp)}
                                disabled={isReplacingId === comp.id}
                                className="bg-emerald-50 hover:bg-emerald-100 text-[#0F8B8D] border border-emerald-200 px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {isReplacingId === comp.id ? 'Replacing...' : '🔄 Replace'}
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(comp.id, comp.name)}
                                disabled={isDeletingId === comp.id}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {isDeletingId === comp.id ? 'Deleting...' : '🗑️ Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h2 className="text-sm font-bold text-[#1E2430]">Email Notification Subscribers</h2>
                <p className="text-[11px] text-[#667085]">Live subscriptions submitted via homepage</p>
              </div>
              <button onClick={fetchSubscribers} className="text-xs text-[#2F6FED] hover:underline font-semibold">
                ↻ Refresh List
              </button>
            </div>

            {isLoadingSubscribers ? (
              <div className="p-8 text-center text-xs text-[#667085]">Loading subscribers...</div>
            ) : subscribers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#667085]">No subscribers recorded yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] text-xs font-semibold text-[#273142] border-b border-gray-200">
                    <th className="p-3">Subscriber Email</th>
                    <th className="p-3">Subscription Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {subscribers.map((sub) => {
                    const formattedDate = new Date(sub.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 text-[#273142]">
                        <td className="p-3 font-mono font-medium text-[#1E2430]">{sub.email}</td>
                        <td className="p-3 text-[#667085]">{formattedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 4: COMPANY REQUESTS */}
        {activeTab === 'suggestions' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h2 className="text-sm font-bold text-[#1E2430]">User-Suggested Companies</h2>
                <p className="text-[11px] text-[#667085]">Requests submitted via homepage</p>
              </div>
              <button onClick={fetchCompanyRequests} className="text-xs text-[#2F6FED] hover:underline font-semibold">
                ↻ Refresh List
              </button>
            </div>

            {isLoadingRequests ? (
              <div className="p-8 text-center text-xs text-[#667085]">Loading company requests...</div>
            ) : companyRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#667085]">No company requests submitted yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] text-xs font-semibold text-[#273142] border-b border-gray-200">
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Country</th>
                    <th className="p-3">Requester's Email</th>
                    <th className="p-3">Request Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {companyRequests.map((req) => {
                    const formattedDate = new Date(req.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={req.id} className="hover:bg-gray-50 text-[#273142]">
                        <td className="p-3 font-bold text-[#1E2430]">{req.company_name}</td>
                        <td className="p-3 text-[#2F6FED] font-medium">{req.country}</td>
                        <td className="p-3 font-mono text-[#667085]">{req.email}</td>
                        <td className="p-3 text-[#667085]">{formattedDate}</td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleRequestStatus(req.id, req.status)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              req.status === 'Completed'
                                ? 'bg-[#0F8B8D]/15 text-[#0F8B8D] border border-[#0F8B8D]/30'
                                : req.status === 'In Progress'
                                ? 'bg-[#2F6FED]/15 text-[#2F6FED] border border-[#2F6FED]/30'
                                : 'bg-gray-100 text-[#667085] border border-gray-300'
                            }`}
                          >
                            {req.status}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
