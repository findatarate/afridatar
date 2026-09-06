'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type DataTab = 'overview' | 'management' | 'pnl' | 'bs' | 'cf' | 'soce' | 'ratios' | 'shareholding';

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

interface OverviewSection {
  id: string;
  section_type: string;
  field_label: string;
  field_value: string;
}

interface Subsidiary {
  id: string;
  subsidiary_name: string;
  shareholding_pct: string;
  purpose: string;
}

interface CreditRating {
  id: string;
  entity_name: string;
  rating: string;
}

interface Shareholder {
  id: string;
  shareholder_name: string;
  percentage: string;
  reporting_date: string;
}

interface ManagementPerson {
  id: string;
  person_name: string;
  role_title: string;
  board_committees: string;
  appointed_date: string;
  profile: string;
  other_directorships: string;
  category: string;
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
  const [activeTab, setActiveTab] = useState<DataTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCountry, setOpenCountry] = useState<string>('');
  
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Tab Dataset States
  const [overviewSections, setOverviewSections] = useState<OverviewSection[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [creditRatings, setCreditRatings] = useState<CreditRating[]>([]);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [managementList, setManagementList] = useState<ManagementPerson[]>([]);
  const [financialRows, setFinancialRows] = useState<DbFinancialRow[]>([]);

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

  useEffect(() => {
    if (!selectedCompany) return;

    async function fetchCompanyData() {
      setIsLoadingData(true);

      const [ovRes, subRes, ratRes, shRes, mgmtRes, stmtRes] = await Promise.all([
        supabase.from('company_overview_sections').select('*').eq('company_id', selectedCompany.id),
        supabase.from('subsidiaries').select('*').eq('company_id', selectedCompany.id),
        supabase.from('credit_ratings').select('*').eq('company_id', selectedCompany.id),
        supabase.from('shareholders').select('*').eq('company_id', selectedCompany.id),
        supabase.from('directors_management').select('*').eq('company_id', selectedCompany.id),
        supabase.from('financial_statements').select('*').eq('company_id', selectedCompany.id),
      ]);

      setOverviewSections(ovRes.data || []);
      setSubsidiaries(subRes.data || []);
      setCreditRatings(ratRes.data || []);
      setShareholders(shRes.data || []);
      setManagementList(mgmtRes.data || []);
      setFinancialRows(stmtRes.data || []);

      setIsLoadingData(false);
    }

    fetchCompanyData();
  }, [selectedCompany]);

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

  const isStatementTab = ['pnl', 'bs', 'cf', 'soce', 'ratios'].includes(activeTab);
  const currentTabStatements = financialRows.filter(
    (s) => s.statement_type.toLowerCase() === activeTab.toLowerCase() && s.line_item !== 'FOOTNOTE'
  );

  const footnoteRow = financialRows.find(
    (s) => s.statement_type.toLowerCase() === activeTab.toLowerCase() && s.line_item === 'FOOTNOTE'
  );

  const uniqueYears = Array.from(new Set(currentTabStatements.map((s) => s.fiscal_year))).filter((y) => y !== 'ALL').sort();

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

    let displayVal = '-';
    if (row.amount_text !== null && row.amount_text !== undefined && row.amount_text.trim() !== '') {
      displayVal = row.amount_text;
    } else if (row.amount !== null && row.amount !== undefined) {
      displayVal = row.amount !== 0 ? row.amount.toLocaleString() : '-';
    }

    item.values[row.fiscal_year] = displayVal;
  });

  const displayRows = Array.from(lineItemMap.values());

  const tabList: { id: DataTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Company Overview', icon: '🏢' },
    { id: 'management', label: 'Directors and Management', icon: '👥' },
    { id: 'pnl', label: 'Income Statement', icon: '📈' },
    { id: 'bs', label: 'Balance Sheet', icon: '⚖️' },
    { id: 'soce', label: 'Statement of Changes in Equity', icon: '📊' },
    { id: 'cf', label: 'Cashflow Statement', icon: '💵' },
    { id: 'ratios', label: 'Ratios', icon: '📐' },
    { id: 'shareholding', label: 'Reported Shareholding', icon: '🤝' },
  ];

  // Helper groupings for Overview tab
  const corporateOverviewList = overviewSections.filter((s) => s.section_type === 'overview');
  const detailedCorpInfoList = overviewSections.filter((s) => s.section_type === 'corp_info');
  const shareCapitalList = overviewSections.filter((s) => s.section_type === 'share_capital');
  const overviewFootnote = overviewSections.find((s) => s.section_type === 'footnote');

  const boardList = managementList.filter((m) => m.category === 'Board');
  const seniorMgmtList = managementList.filter((m) => m.category === 'Executive');

  return (
    <div className="min-h-screen bg-white text-[#1E2430] flex flex-col font-sans">
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

        {/* Main Content Viewer Area */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-white relative">
          {!selectedCompany ? (
            <div className="bg-[#F8FAFC] border border-gray-200 p-12 text-center rounded-lg">
              <p className="text-[#667085] text-sm">No company selected.</p>
            </div>
          ) : (
            <>
              {/* Header Info Card */}
              <div className="bg-[#F8FAFC] border border-gray-200 p-5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-[#1E2430]">{selectedCompany.name}</h1>
                    <span className="bg-[#0F8B8D]/15 text-[#0F8B8D] text-xs font-semibold px-2 py-0.5 rounded border border-[#0F8B8D]/30">
                      {selectedCompany.ticker}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085]">
                    {selectedCompany.country} • {selectedCompany.sector}
                  </p>
                </div>

                <div className="text-xs text-[#667085] bg-white px-3 py-2 rounded border border-gray-200 shadow-sm font-semibold">
                  Primary Corporate Database
                </div>
              </div>

              {/* Frozen Navigation Header */}
              <div className="sticky top-0 z-20 bg-white py-2 border-b border-gray-200 flex gap-2 overflow-x-auto shadow-sm">
                {tabList.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-[#2F6FED] text-white shadow-md'
                          : 'bg-[#F1F5F9] text-[#667085] hover:text-[#1E2430] hover:bg-gray-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Display Area */}
              {isLoadingData ? (
                <div className="p-8 text-center text-xs text-[#667085]">Loading dataset...</div>
              ) : (
                <>
                  {/* TAB 1: Company Overview */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Section A: Corporate Overview Top Card */}
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#273142] text-white font-bold text-sm">
                          Corporate Overview
                        </div>
                        <div className="p-4 divide-y divide-gray-200 text-xs">
                          {corporateOverviewList.map((item) => (
                            <div key={item.id} className="py-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                              <span className="font-bold text-[#273142] md:col-span-1">{item.field_label}</span>
                              <span className="text-[#1E2430] md:col-span-3 leading-relaxed whitespace-pre-wrap">{item.field_value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section B: Side-by-Side 3-Column Tables */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Table 1: Detailed Corporate Information */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
                          <div className="p-3 bg-[#F8FAFC] border-b border-gray-200 font-bold text-xs text-[#1E2430]">
                            Detailed Corporate Information
                          </div>
                          <div className="p-3 divide-y divide-gray-100 text-xs flex-1">
                            {detailedCorpInfoList.map((item) => (
                              <div key={item.id} className="py-2.5 flex flex-col gap-0.5">
                                <span className="font-semibold text-[#667085] text-[11px]">{item.field_label}</span>
                                <span className="text-[#1E2430] font-medium leading-snug whitespace-pre-wrap">{item.field_value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Table 2: Subsidiaries of the company */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
                          <div className="p-3 bg-[#F8FAFC] border-b border-gray-200 font-bold text-xs text-[#1E2430]">
                            Subsidiaries of the Company
                          </div>
                          <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                                  <th className="p-2.5">Subsidiary</th>
                                  <th className="p-2.5">Holding</th>
                                  <th className="p-2.5">Purpose</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 text-[11px]">
                                {subsidiaries.map((sub) => (
                                  <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="p-2.5 font-bold text-[#1E2430]">{sub.subsidiary_name}</td>
                                    <td className="p-2.5 font-mono text-[#0F8B8D] font-bold">{sub.shareholding_pct}</td>
                                    <td className="p-2.5 text-[#667085] leading-tight">{sub.purpose}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Table 3: Credit Ratings */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
                          <div className="p-3 bg-[#F8FAFC] border-b border-gray-200 font-bold text-xs text-[#1E2430]">
                            Credit Ratings
                          </div>
                          <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                                  <th className="p-2.5">Entity Name</th>
                                  <th className="p-2.5">Rating</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 text-[11px]">
                                {creditRatings.map((rat) => (
                                  <tr key={rat.id} className="hover:bg-gray-50">
                                    <td className="p-2.5 font-bold text-[#1E2430]">{rat.entity_name}</td>
                                    <td className="p-2.5 font-mono text-[#2F6FED] font-semibold">{rat.rating}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Section C: Top Shareholders & Capital Structure */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <div className="p-3 bg-[#F8FAFC] border-b border-gray-200 font-bold text-xs text-[#1E2430]">
                            Top Shareholders
                          </div>
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                                <th className="p-2.5">Shareholder Name</th>
                                <th className="p-2.5 text-right">Percentage</th>
                                <th className="p-2.5 text-right">Reporting Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-[11px] font-mono">
                              {shareholders.map((sh) => (
                                <tr key={sh.id} className="hover:bg-gray-50">
                                  <td className="p-2.5 font-bold text-[#1E2430] font-sans">{sh.shareholder_name}</td>
                                  <td className="p-2.5 text-right text-[#0F8B8D] font-bold">{sh.percentage}</td>
                                  <td className="p-2.5 text-right text-[#667085]">{sh.reporting_date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm p-4 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-xs text-[#1E2430] border-b pb-2 mb-3">Share Capital Summary</h3>
                            <div className="space-y-3 text-xs">
                              {shareCapitalList.map((sc) => (
                                <div key={sc.id} className="flex flex-col gap-0.5">
                                  <span className="text-[#667085] text-[11px]">{sc.field_label}</span>
                                  <span className="font-bold text-[#2F6FED] text-sm font-mono">{sc.field_value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footnotes */}
                      {overviewFootnote && (
                        <div className="p-3 bg-[#F8FAFC] border border-gray-200 rounded-lg text-[11px] text-[#667085] italic leading-relaxed">
                          {overviewFootnote.field_value}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Directors and Management */}
                  {activeTab === 'management' && (
                    <div className="space-y-8">
                      {/* Section 1: Board of Directors */}
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#273142] text-white font-bold text-sm">
                          Board of Directors
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                            <thead>
                              <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                                <th className="p-3 w-[180px]">Name</th>
                                <th className="p-3 w-[160px]">Position Held</th>
                                <th className="p-3 w-[160px]">Board Committees</th>
                                <th className="p-3 w-[110px]">Appointed Date</th>
                                <th className="p-3 min-w-[250px]">Profile</th>
                                <th className="p-3 min-w-[200px]">Other Directorships</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-[11px]">
                              {boardList.map((person) => (
                                <tr key={person.id} className="hover:bg-gray-50 align-top">
                                  <td className="p-3 font-bold text-[#1E2430]">{person.person_name}</td>
                                  <td className="p-3 text-[#2F6FED] font-medium">{person.role_title}</td>
                                  <td className="p-3 text-[#667085]">{person.board_committees}</td>
                                  <td className="p-3 text-[#667085]">{person.appointed_date}</td>
                                  <td className="p-3 text-[#1E2430] leading-relaxed whitespace-pre-wrap">{person.profile}</td>
                                  <td className="p-3 text-[#667085] leading-relaxed whitespace-pre-wrap">{person.other_directorships}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section 2: Senior Management */}
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#273142] text-white font-bold text-sm">
                          Executive & Senior Management
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                            <thead>
                              <tr className="bg-[#F1F5F9] text-[#273142] border-b border-gray-200 font-bold">
                                <th className="p-3 w-[180px]">Name</th>
                                <th className="p-3 w-[160px]">Position Held</th>
                                <th className="p-3 w-[160px]">Board Committees</th>
                                <th className="p-3 w-[110px]">Appointed Date</th>
                                <th className="p-3 min-w-[250px]">Profile</th>
                                <th className="p-3 min-w-[200px]">Other Directorships</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-[11px]">
                              {seniorMgmtList.map((person) => (
                                <tr key={person.id} className="hover:bg-gray-50 align-top">
                                  <td className="p-3 font-bold text-[#1E2430]">{person.person_name}</td>
                                  <td className="p-3 text-[#0F8B8D] font-medium">{person.role_title}</td>
                                  <td className="p-3 text-[#667085]">{person.board_committees}</td>
                                  <td className="p-3 text-[#667085]">{person.appointed_date}</td>
                                  <td className="p-3 text-[#1E2430] leading-relaxed whitespace-pre-wrap">{person.profile}</td>
                                  <td className="p-3 text-[#667085] leading-relaxed whitespace-pre-wrap">{person.other_directorships}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3-7: Financial Statements & Ratios */}
                  {isStatementTab && (
                    <div className="space-y-4">
                      {displayRows.length === 0 ? (
                        <div className="bg-[#F8FAFC] border border-gray-200 p-12 text-center rounded-lg">
                          <p className="text-[#667085] text-sm">
                            No data uploaded for <span className="uppercase font-semibold">{activeTab}</span>.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                              <tr className="border-b border-gray-200 bg-[#F8FAFC] text-xs font-bold text-[#273142]">
                                <th className="p-3 w-[151px] min-w-[151px] max-w-[151px] border-r border-gray-200 sticky left-0 bg-[#F8FAFC] z-10 whitespace-normal break-words">
                                  Line Item / Metric
                                </th>
                                {uniqueYears.map((year) => (
                                  <th key={year} className="p-3 text-right w-[120px] min-w-[120px]">
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
                                      <td className="p-3 w-[151px] min-w-[151px] max-w-[151px] border-r border-gray-200 sticky left-0 bg-[#F1F5F9] z-10 font-sans whitespace-normal break-words uppercase tracking-wide">
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
                                    <tr key={idx} className="bg-[#0F8B8D]/10 text-[#1E2430] font-bold border-t border-b-2 border-[#1E2430]">
                                      <td className="p-3 w-[151px] min-w-[151px] max-w-[151px] border-r border-gray-200 sticky left-0 bg-[#F8FAFC] z-10 font-sans whitespace-normal break-words">
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
                                    <td
                                      className={`p-2.5 w-[151px] min-w-[151px] max-w-[151px] border-r border-gray-200 sticky left-0 bg-white z-10 font-sans whitespace-normal break-words leading-snug ${
                                        row.indent ? 'pl-6 text-[#667085]' : ''
                                      }`}
                                    >
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

                      {footnoteRow && (
                        <div className="p-3 bg-[#F8FAFC] border border-gray-200 rounded-lg text-[11px] text-[#667085] italic leading-relaxed">
                          {footnoteRow.amount_text}
                        </div>
                      )}
                    </div>
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
                              <th className="p-3 text-right">Shareholding (%)</th>
                              <th className="p-3 text-right">Reporting Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 font-mono">
                            {shareholders.map((sh) => (
                              <tr key={sh.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-[#1E2430] font-sans">{sh.shareholder_name}</td>
                                <td className="p-3 text-right text-[#0F8B8D] font-bold">{sh.percentage}</td>
                                <td className="p-3 text-right text-[#667085]">{sh.reporting_date}</td>
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
