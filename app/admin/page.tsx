'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

type AdminTab = 'upload' | 'subscribers' | 'suggestions';

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

interface Suggestion {
  id: string;
  companyName: string;
  country: string;
  email: string;
  requestedAt: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

const MOCK_SUBSCRIBERS: Subscriber[] = [
  { id: '1', email: 'investor.rel@capital.co.zw', subscribedAt: '2026-08-10' },
  { id: '2', email: 'analyst@africanmarkets.com', subscribedAt: '2026-08-12' },
  { id: '3', email: 'finance@hararecap.com', subscribedAt: '2026-08-15' },
];

const MOCK_SUGGESTIONS: Suggestion[] = [
  { id: '1', companyName: 'Delta Corporation', country: 'Zimbabwe', email: 'research@fund.co.zw', requestedAt: '2026-08-11', status: 'In Progress' },
  { id: '2', companyName: 'Econet Wireless', country: 'Zimbabwe', email: 'trader@zimstocks.com', requestedAt: '2026-08-14', status: 'Pending' },
  { id: '3', companyName: 'Safaricom', country: 'Kenya', email: 'ke.analyst@frontier.io', requestedAt: '2026-08-16', status: 'Pending' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('upload');
  const [subscribers] = useState<Subscriber[]>(MOCK_SUBSCRIBERS);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);

  // Form input states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCompany, setTargetCompany] = useState('CABS');
  const [targetTicker, setTargetTicker] = useState('CABS.zw');
  const [targetCountry, setTargetCountry] = useState('Zimbabwe');
  const [targetSector, setTargetSector] = useState('Banking & Financial Services');
  
  // Status & loading states
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  // Helper function: Keyword/Fuzzy matching for tab names
  const detectStatementType = (sheetName: string): string | null => {
    const name = sheetName.toLowerCase().replace(/[^a-z0-9&]/g, '');

    // P&L / Income Statement
    if (
      name.includes('pnl') ||
      name.includes('p&l') ||
      name.includes('income') ||
      name.includes('profit') ||
      name.includes('loss')
    ) {
      return 'pnl';
    }

    // Balance Sheet / SOFP
    if (
      name.includes('bs') ||
      name.includes('sofp') ||
      name.includes('balance') ||
      name.includes('position')
    ) {
      return 'bs';
    }

    // Cash Flow / SOCF
    if (
      name.includes('cf') ||
      name.includes('socf') ||
      name.includes('cash') ||
      name.includes('flow')
    ) {
      return 'cf';
    }

    // Statement of Changes in Equity / SOCE
    if (
      name.includes('soce') ||
      name.includes('equity') ||
      name.includes('change')
    ) {
      return 'soce';
    }

    return null;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      // 1. Read Excel file
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // 2. Check if company exists in Supabase or create new entity
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', targetCompany)
        .maybeSingle();

      let companyId = existingCompany?.id;

      if (!companyId) {
        const { data: newCompany, error: createErr } = await supabase
          .from('companies')
          .insert({
            name: targetCompany,
            ticker: targetTicker,
            country: targetCountry,
            sector: targetSector,
            currency: 'USD / ZWG',
          })
          .select('id')
          .single();

        if (createErr) throw new Error(`Failed to create company: ${createErr.message}`);
        companyId = newCompany.id;
      }

      const statementEntries: Array<{
        company_id: string;
        statement_type: string;
        line_item: string;
        fiscal_year: string;
        amount: number;
        is_header: boolean;
        is_total: boolean;
        indent: boolean;
      }> = [];

      const parsedTabs: string[] = [];

      // 3. Iterate through workbook tabs using keyword matching
      for (const sheetName of workbook.SheetNames) {
        const statementType = detectStatementType(sheetName);
        if (!statementType) continue;

        parsedTabs.push(`${sheetName} ➔ [${statementType.toUpperCase()}]`);

        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonRows.length < 1) continue;

        // Find the header row containing year columns (e.g. 2021, 2022, 2023, 2024, 2025)
        let headerRowIndex = -1;
        let yearColumns: Array<{ year: string; colIndex: number }> = [];

        for (let i = 0; i < Math.min(jsonRows.length, 10); i++) {
          const row = jsonRows[i];
          if (!row) continue;

          const yearsInRow: Array<{ year: string; colIndex: number }> = [];
          row.forEach((cell: any, colIdx: number) => {
            const cellStr = String(cell || '').trim();
            const yearMatch = cellStr.match(/\b(20\d{2})\b/);
            if (yearMatch && colIdx > 0) {
              yearsInRow.push({ year: yearMatch[1], colIndex: colIdx });
            }
          });

          if (yearsInRow.length > 0) {
            headerRowIndex = i;
            yearColumns = yearsInRow;
            break;
          }
        }

        // Fallback: If no explicit year header found, assume row 0 has years in cols 1..N
        if (headerRowIndex === -1 && jsonRows.length > 1) {
          headerRowIndex = 0;
          jsonRows[0].forEach((cell: any, idx: number) => {
            if (idx > 0 && cell) {
              const str = String(cell).trim();
              const match = str.match(/\d{4}/);
              yearColumns.push({ year: match ? match[0] : str, colIndex: idx });
            }
          });
        }

        // Clear existing financial statement rows for this company & statement type
        await supabase
          .from('financial_statements')
          .delete()
          .eq('company_id', companyId)
          .eq('statement_type', statementType);

        // Process data rows
        for (let r = headerRowIndex + 1; r < jsonRows.length; r++) {
          const row = jsonRows[r];
          if (!row || !row[0]) continue;

          const rawLabel = String(row[0]).trim();
          if (!rawLabel) continue;

          const isHeader = rawLabel.toUpperCase() === rawLabel && !row.some((val: any, i: number) => i > 0 && val !== '' && val !== null);
          const isTotal = rawLabel.toLowerCase().includes('total') || rawLabel.toLowerCase().includes('profit') || rawLabel.toLowerCase().includes('net');
          const indent = String(row[0]).startsWith(' ') || String(row[0]).startsWith('\t');

          yearColumns.forEach(({ year, colIndex }) => {
            const rawVal = row[colIndex];
            const numericVal = rawVal !== undefined && rawVal !== null && rawVal !== '' ? Number(rawVal) : 0;

            statementEntries.push({
              company_id: companyId,
              statement_type: statementType,
              line_item: rawLabel,
              fiscal_year: year,
              amount: isNaN(numericVal) ? 0 : numericVal,
              is_header: isHeader,
              is_total: isTotal,
              indent,
            });
          });
        }
      }

      if (statementEntries.length === 0) {
        throw new Error(
          `No financial tabs detected in "${selectedFile.name}".\n\nDetected sheets in your file: [${workbook.SheetNames.join(', ')}].\n\nPlease rename your tabs so they contain keywords like "P&L", "Balance Sheet", "Cash Flow", or "Equity".`
        );
      }

      // 4. Batch insert data into Supabase
      const { error: insertErr } = await supabase
        .from('financial_statements')
        .insert(statementEntries);

      if (insertErr) throw new Error(`Database upload failed: ${insertErr.message}`);

      setUploadStatus({
        message: `Successfully uploaded ${selectedFile.name}! Matched tabs: (${parsedTabs.join(' | ')}). Uploaded ${statementEntries.length} data points to Supabase.`,
      });
      setSelectedFile(null);
    } catch (err: any) {
      setUploadStatus({
        message: err.message || 'An error occurred during upload.',
        isError: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSuggestionStatus = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus: Suggestion['status'] =
            s.status === 'Pending' ? 'In Progress' : s.status === 'In Progress' ? 'Completed' : 'Pending';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#1E2430] flex flex-col font-sans">
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
        <div className="border-b border-gray-200 flex gap-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            📊 Upload Financial Spreads (Excel to Supabase)
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'subscribers'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            📬 Subscribers ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-[#2F6FED] text-[#2F6FED]'
                : 'border-transparent text-[#667085] hover:text-[#1E2430]'
            }`}
          >
            💡 Company Requests ({suggestions.length})
          </button>
        </div>

        {/* TAB 1: EXCEL UPLOAD TO SUPABASE */}
        {activeTab === 'upload' && (
          <div className="bg-[#F8FAFC] border border-gray-200 p-6 rounded-xl max-w-2xl shadow-sm">
            <h2 className="text-xl font-bold text-[#1E2430] mb-1">Import Excel Spreads to Supabase</h2>
            <p className="text-xs text-[#667085] mb-6">
              Upload an Excel workbook containing financial tabs (<code className="text-[#0F8B8D]">P&L / IS</code>, <code className="text-[#0F8B8D]">BS / SOFP</code>, <code className="text-[#0F8B8D]">CF / SOCF</code>, <code className="text-[#0F8B8D]">SOCE</code>).
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
                    <span className="text-[10px] text-[#667085]">Automatically inserts into Supabase tables</span>
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

        {/* TAB 2: SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-sm font-bold text-[#1E2430]">Email Notification Subscribers</h2>
              <span className="text-xs text-[#667085]">Total: {subscribers.length}</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-xs font-semibold text-[#273142] border-b border-gray-200">
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Subscription Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 text-[#273142]">
                    <td className="p-3 font-mono text-[#1E2430]">{sub.email}</td>
                    <td className="p-3 text-[#667085]">{sub.subscribedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SUGGESTIONS */}
        {activeTab === 'suggestions' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
              <h2 className="text-sm font-bold text-[#1E2430]">User-Suggested Companies</h2>
              <span className="text-xs text-[#667085]">Click status badge to toggle</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-xs font-semibold text-[#273142] border-b border-gray-200">
                  <th className="p-3">Company Name</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Requester Email</th>
                  <th className="p-3">Requested Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {suggestions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 text-[#273142]">
                    <td className="p-3 font-bold text-[#1E2430]">{s.companyName}</td>
                    <td className="p-3 text-[#2F6FED]">{s.country}</td>
                    <td className="p-3 font-mono text-[#667085]">{s.email}</td>
                    <td className="p-3 text-[#667085]">{s.requestedAt}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleSuggestionStatus(s.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          s.status === 'Completed'
                            ? 'bg-[#0F8B8D]/15 text-[#0F8B8D] border border-[#0F8B8D]/30'
                            : s.status === 'In Progress'
                            ? 'bg-[#2F6FED]/15 text-[#2F6FED] border border-[#2F6FED]/30'
                            : 'bg-gray-100 text-[#667085] border border-gray-300'
                        }`}
                      >
                        {s.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
