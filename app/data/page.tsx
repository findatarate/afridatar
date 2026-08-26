'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 8 Tab Types in the requested order
type DataTab = 'info' | 'management' | 'pnl' | 'bs' | 'cf' | 'soce' | 'ratios' | 'shareholding';

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

interface InfoItem {
  id: string;
  field_label: string;
  field_value: string;
}

interface ManagementPerson {
  id: string;
  person_name: string;
  role_title: string;
  category: string;
}

interface Shareholder {
  id: string;
  shareholder_name: string;
  shares_count: string;
  percentage: string;
}

interface DbFinancialRow {
  id: string;
  statement_type: string;
  line_item: string;
  fiscal_year: string;
  amount: number;
  amount_text?: string;
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
  const [activeTab, setActiveTab] = useState<DataTab>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCountry, setOpenCountry] = useState<string>('');
  
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Tab Dataset States
  const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
  const [managementList, setManagementList] = useState<ManagementPerson[]>([]);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [financialRows, setFinancialRows] = useState<DbFinancialRow[]>([]);

  // 1. Fetch Companies list on Mount
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

  // 2. Fetch all tab datasets when selected company changes
  useEffect(() => {
    if (!selectedCompany) return;

    async function fetchCompanyData() {
      setIsLoadingData(true);

      const [infoRes, mgmtRes, shareRes, stmtRes] = await Promise.all([
        supabase.from('company_info_items').select('*').eq('company_id', selectedCompany.id),
        supabase.from('directors_management').select('*').eq('company_id', selectedCompany.id),
        supabase.from('shareholders').select('*').eq('company_id', selectedCompany.id),
        supabase.from('financial_statements').select('*').eq('company_id', selectedCompany.id),
      ]);

      setInfoItems(infoRes.data || []);
      setManagementList(mgmtRes.data || []);
      setShareholders(shareRes.data || []);
      setFinancialRows(stmtRes.data || []);

      setIsLoadingData(false);
    }

    fetchCompanyData();
  }, [selectedCompany]);

  // Group directory folders
  const countryFolders: CountryFolder[] = companies.reduce((acc: CountryFolder[], comp) => {
    let folder = acc.find((f) => f.country.toLowerCase() === comp.country.toLowerCase());
    if (!folder) {
      folder = { country: comp.country, companies: [] };
      acc.push(folder);
    }
    folder.companies.push(comp);
    return acc;
  }, []);

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

  // Filter financial statement rows for current active tab (pnl, bs, cf, soce, ratios)
  const isStatementTab = ['pnl', 'bs', 'cf', 'soce', 'ratios'].includes(activeTab);
  const currentTabStatements = financialRows.filter(
    (s) => s.statement_type.toLowerCase() === activeTab.toLowerCase()
  );

  const uniqueYears = Array.from(new Set(currentTabStatements.map((s) => s.fiscal_year))).sort();

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
    item.values[row.fiscal_year] = row.amount_text || (row.amount !== null ? row.amount.toLocaleString() : '-');
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
              <p className="text-xs text-[#667085] py-2">Loading companies...</p>
            ) : filteredDirectory.length === 0 ? (
              <p className="text-xs text-[#667085] py-2">No companies found.</p>
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
              <p className="text-[#667085] text-sm">No company selected.</p>
            </div>
          ) : (
            <>
              {/* Company Header Card */}
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
                  Live Corporate Database
                </div>
              </div>

              {/* 8 Tab Navigation Switcher (In Specified Order) */}
              <div className="border-b border-gray-200 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'info'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  🏢 Company Information
                </button>
                <button
                  onClick={() => setActiveTab('management')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'management'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  👥 Directors & Key Management
                </button>
                <button
                  onClick={() => setActiveTab('pnl')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'pnl'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  📈 Income Statement
                </button>
                <button
                  onClick={() => setActiveTab('bs')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'bs'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  ⚖️ Balance Sheet
                </button>
                <button
                  onClick={() => setActiveTab('cf')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'cf'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  💵 Cashflow Statement
                </button>
                <button
                  onClick={() => setActiveTab('soce')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'soce'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  📊 Statement of Changes in Equity
                </button>
                <button
                  onClick={() => setActiveTab('ratios')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'ratios'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  📐 Ratios
                </button>
                <button
                  onClick={() => setActiveTab('shareholding')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                    activeTab === 'shareholding'
                      ? 'bg-white text-[#2F6FED] border-t-2 border-[#2F6FED] border-x border-gray-200 shadow-sm'
                      : 'text-[#667085] hover:text-[#1E2430] bg-[#F1F5F9]'
                  }`}
                >
                  🤝 Reported Shareholding
                </button>
              </div>

              {/* Content Panel Rendering */}
              {isLoadingData ? (
                <div className="p-8 text-center text-xs text-[#667085]">Loading dataset...</div>
              ) : (
                <>
                  {/* TAB 1: Company Information */}
                  {activeTab === 'info' && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-4 bg-[#F8FAFC] border-b border-gray-200 font-bold text-sm text-[#1E2430]">
                        Company Profile & Overview
                      </div>
                      {infoItems.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#667085]">No company information recorded.</div>
                      ) : (
                        <div className="divide-y divide-gray-200 text-xs">
                          {infoItems.map((item) => (
                            <div key={item.id} className="grid grid-cols-3 p-3 hover:bg-gray-50">
                              <span className="font-semibold text-[#667085]">{item.field_label}</span>
                              <span className="col-span-2 text-[#1E2430]">{item.field_value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Directors & Key Management */}
                  {activeTab === 'management' && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-4 bg-[#F8FAFC] border-b border-gray-200 font-bold text-sm text-[#1E2430]">
                        Board of Directors & Senior Management
                      </div>
                      {managementList.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#667085]">No management records uploaded.</div>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                              <th className="p-3">Name</th>
                              <th className="p-3">Position / Role</th>
                              <th className="p-3">Category</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {managementList.map((person) => (
                              <tr key={person.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-[#1E2430]">{person.person_name}</td>
                                <td className="p-3 text-[#667085]">{person.role_title}</td>
                                <td className="p-3">
                                  <span className="bg-[#2F6FED]/10 text-[#2F6FED] px-2 py-0.5 rounded text-[10px] font-semibold border border-[#2F6FED]/20">
                                    {person.category}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB 3-7: Multi-Year Financial Statements & Ratios */}
                  {isStatementTab && (
                    <>
                      {displayRows.length === 0 ? (
                        <div className="bg-[#F8FAFC] border border-gray-200 p-12 text-center rounded-lg">
                          <p className="text-[#667085] text-sm">
                            No data uploaded for <span className="uppercase font-semibold">{activeTab}</span>.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="border-b border-gray-200 bg-[#F8FAFC] text-xs font-bold text-[#273142]">
                                <th className="p-3 sticky left-0 bg-[#F8FAFC] min-w-[280px] border-r border-gray-200">
                                  Line Item / Metric
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

                  {/* TAB 8: Reported Shareholding */}
                  {activeTab === 'shareholding' && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="p-4 bg-[#F8FAFC] border-b border-gray-200 font-bold text-sm text-[#1E2430]">
                        Major & Significant Shareholdings
                      </div>
                      {shareholders.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#667085]">No shareholding data recorded.</div>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                              <th className="p-3">Shareholder Name</th>
                              <th className="p-3 text-right">Number of Shares</th>
                              <th className="p-3 text-right">Shareholding (%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 font-mono">
                            {shareholders.map((sh) => (
                              <tr key={sh.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-[#1E2430] font-sans">{sh.shareholder_name}</td>
                                <td className="p-3 text-right text-[#667085]">{sh.shares_count}</td>
                                <td className="p-3 text-right text-[#0F8B8D] font-bold">{sh.percentage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
