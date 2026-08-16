'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type StatementTab = 'pnl' | 'bs' | 'cf' | 'soce';

interface Company {
  id: string;
  name: string;
  ticker: string;
  country: string;
  sector: string;
  currency?: string;
}

interface CountryFolder {
  country: string;
  companies: Company[];
}

interface DbFinancialRow {
  id: string;
  company_id: string;
  statement_type: string;
  line_item: string;
  fiscal_year: string;
  amount: number;
  is_header: boolean;
  is_total: boolean;
  indent: boolean;
}

interface DisplayRow {
  label: string;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  values: { [year: string]: string };
}

export default function DataPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<StatementTab>('pnl');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCountry, setOpenCountry] = useState<string>('');
  
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingStatements, setIsLoadingStatements] = useState(false);
  const [rawStatements, setRawStatements] = useState<DbFinancialRow[]>([]);

  // 1. Load all companies from Supabase on page mount
  useEffect(() => {
    async function fetchCompanies() {
      setIsLoadingCompanies(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('country', { ascending: true })
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        setCompanies(data);
        setSelectedCompany(data[0]);
        setOpenCountry(data[0].country);
      } else {
        setCompanies([]);
      }
      setIsLoadingCompanies(false);
    }

    fetchCompanies();
  }, []);

  // 2. Fetch financial statements whenever the selected company changes
  useEffect(() => {
    if (!selectedCompany) return;

    async function fetchStatements() {
      setIsLoadingStatements(true);
      const { data, error } = await supabase
        .from('financial_statements')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (!error && data) {
        setRawStatements(data);
      } else {
        setRawStatements([]);
      }
      setIsLoadingStatements(false);
    }

    fetchStatements();
  }, [selectedCompany]);

  // Group companies into country folders dynamically
  const countryFolders: CountryFolder[] = companies.reduce((acc: CountryFolder[], comp) => {
    let folder = acc.find((f) => f.country.toLowerCase() === comp.country.toLowerCase());
    if (!folder) {
      folder = { country: comp.country, companies: [] };
      acc.push(folder);
    }
    folder.companies.push(comp);
    return acc;
  }, []);

  // Filter directory based on search query
  const filteredDirectory = countryFolders
    .map((folder) => {
      const matchingCompanies = folder.companies.filter(
        (comp) =>
          comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.sector.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...folder, companies: matchingCompanies };
    })
    .filter((folder) => folder.companies.length > 0);

  // Filter statement rows for the current active tab (pnl, bs, cf, soce)
  const currentTabStatements = rawStatements.filter(
    (s) => s.statement_type.toLowerCase() === activeTab.toLowerCase()
  );

  // Extract unique fiscal years sorted chronologically
  const uniqueYears = Array.from(
    new Set(currentTabStatements.map((s) => s.fiscal_year))
  ).sort((a, b) => a.localeCompare(b));

  // Build multi-year line item rows
  const lineItemMap = new Map<string, DisplayRow>();

  currentTabStatements.forEach((row) => {
    const key = row.line_item;
    if (!lineItemMap.has(key)) {
      lineItemMap.set(key, {
        label: row.line_item,
        isHeader: row.is_header,
        isTotal: row.is_total,
        indent: row.indent,
        values: {},
      });
    }
    const item = lineItemMap.get(key)!;
    item.values[row.fiscal_year] =
      row.amount !== null && row.amount !== undefined ? row.amount.toLocaleString() : '0';
  });

  const displayRows = Array.from(lineItemMap.values());

  return (
    <div className="min-h-screen bg-white text-[#1E2430] flex flex-col font-sans">
      {/* Dark Header Anchor */}
      <header className="border-b border-gray-200 bg-[#273142] text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-white tracking-tight">
            Afri<span className="text-[#2F6FED]">Datar</span>
          </Link>
          <span className="text-xs text-gray-300 bg-[#1E2430] px-2.5 py-1 rounded border border-gray-700">
            Data Library
          </span>
        </div>
        <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
          ← Back to Home
        </Link>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Directory */}
        <aside className="w-full md:w-72 bg-[#F8FAFC] border-r border-gray-200 p-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-[#667085] uppercase tracking-wider block mb-1">
              Search Data
            </label>
            <input
              type="text"
              placeholder="Search company or ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] placeholder-[#667085] focus:outline-none focus:border-[#2F6FED]"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider block mb-2">
              Country Directory
            </span>

            {isLoadingCompanies ? (
              <p className="text-xs text-[#667085] py-2">Loading database companies...</p>
            ) : filteredDirectory.length === 0 ? (
              <p className="text-xs text-[#667085] py-2">No companies uploaded yet.</p>
            ) : (
              filteredDirectory.map((folder) => (
                <div key={folder.country} className="mb-3">
                  <button
                    onClick={() => setOpenCountry(openCountry === folder.country ? '' : folder.country)}
                    className="w-full text-left font-bold text-sm text-[#2F6FED] flex justify-between items-center py-1 hover:opacity-80"
                  >
                    <span>📁 {folder.country}</span>
                    <span className="text-xs">{openCountry === folder.country ? '▼' : '▶'}</span>
                  </button>

                  {openCountry === folder.country && (
                    <div className="ml-4 mt-1 space-y-1">
                      {folder.companies.map((comp) => (
                        <button
                          key={comp.id}
                          onClick={() => setSelectedCompany(comp)}
                          className={`w-full text-left text-xs px-2.5 py-1.5 rounded flex justify-between items-center transition-colors ${
                            selectedCompany?.id === comp.id
                              ? 'bg-[#0F8B8D] text-white font-semibold'
                              : 'text-[#273142] hover:bg-gray-200/60'
                          }`}
                        >
                          <span>{comp.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{comp.ticker}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Financial Viewer Area */}
        <main className="flex-1 p-6 overflow-x-auto flex flex-col gap-6 bg-white">
          {!selectedCompany ? (
            <div className="bg-[#F8FAFC] border border-gray-200 p-12 text-center rounded-lg">
              <p className="text-[#667085] text-sm">
                No company selected. Upload a company file in the Admin Portal to get started.
              </p>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <div className="bg-[#F8FAFC] border border-gray-200 p-5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-[#1E2430]">{selectedCompany.name}</h1>
                    <span className="bg-[#0F8B8D]/15 text-[#0F8B8D] text-xs font-semibold px-2 py-0.5 rounded border border-[#0F8B8D]/30">
                      {selectedCompany.ticker}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085]">
                    {selectedCompany.country} • {selectedCompany.sector} • Reporting Currency: <span className="text-[#1E2430] font-medium">{selectedCompany.currency || 'USD / ZWG'}</span>
                  </p>
                </div>

                <div className="text-xs text-[#667085] bg-white px-3 py-2 rounded border border-gray-200 shadow-sm">
                  Live Database View • Standardized Spread
                </div>
              </div>

              {/* Statement Switcher Tabs */}
              <div className="border-b border-gray-200 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab('pnl')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                    activeTab === 'pnl'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  Income Statement (P&L)
                </button>
                <button
                  onClick={() => setActiveTab('bs')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                    activeTab === 'bs'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  Balance Sheet (BS)
                </button>
                <button
                  onClick={() => setActiveTab('cf')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                    activeTab === 'cf'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  Cash Flow (CF)
                </button>
                <button
                  onClick={() => setActiveTab('soce')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors ${
                    activeTab === 'soce'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  Statement of Changes in Equity (SOCE)
                </button>
              </div>

              {/* Financial Table Grid */}
              {isLoadingStatements ? (
                <div className="p-8 text-center text-xs text-[#667085]">
                  Loading financial statements from database...
                </div>
              ) : displayRows.length === 0 ? (
                <div className="bg-[#F8FAFC] border border-gray-200 p-12 text-center rounded-lg">
                  <p className="text-[#667085] text-sm">
                    No <span className="uppercase font-semibold">{activeTab}</span> data found in Supabase for {selectedCompany.name}.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-[#F8FAFC] text-xs font-bold text-[#273142]">
                        <th className="p-3 sticky left-0 bg-[#F8FAFC] min-w-[280px] border-r border-gray-200">
                          Line Item ({selectedCompany.currency || 'USD / ZWG'})
                        </th>
                        {uniqueYears.map((year) => (
                          <th key={year} className="p-3 text-right min-w-[100px]">
                            FY {year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-xs font-mono">
                      {displayRows.map((row, idx) => {
                        if (row.isHeader) {
                          return (
                            <tr key={idx} className="bg-[#F1F5F9] text-[#1E2430] font-bold">
                              <td className="p-3 sticky left-0 bg-[#F1F5F9] border-r border-gray-200 font-sans">
                                {row.label}
                              </td>
                              {uniqueYears.map((yr) => (
                                <td key={yr} className="p-3 text-right text-[#2F6FED]">
                                  {row.values[yr] || '-'}
                                </td>
                              ))}
                            </tr>
                          );
                        }

                        if (row.isTotal) {
                          return (
                            <tr key={idx} className="bg-[#0F8B8D]/10 text-[#1E2430] font-bold border-t border-b border-[#0F8B8D]/30">
                              <td className="p-3 sticky left-0 bg-[#F8FAFC] border-r border-gray-200 font-sans">
                                {row.label}
                              </td>
                              {uniqueYears.map((yr) => (
                                <td key={yr} className="p-3 text-right text-[#0F8B8D]">
                                  {row.values[yr] || '-'}
                                </td>
                              ))}
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx} className="hover:bg-gray-50 text-[#273142]">
                            <td className={`p-2.5 sticky left-0 bg-white border-r border-gray-200 font-sans ${row.indent ? 'pl-7 text-[#667085]' : ''}`}>
                              {row.label}
                            </td>
                            {uniqueYears.map((yr) => (
                              <td key={yr} className="p-2.5 text-right">
                                {row.values[yr] || '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
