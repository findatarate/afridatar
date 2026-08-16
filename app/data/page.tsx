'use client';

import Link from 'next/link';
import { useState } from 'react';

type StatementTab = 'pnl' | 'bs' | 'cf' | 'soce';

interface FinancialRow {
  label: string;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  values: { [year: string]: string };
}

const YEARS = ['2021', '2022', '2023', '2024', '2025'];

const PNL_DATA: FinancialRow[] = [
  { label: 'Interest & Similar Income', values: { '2021': '54.2', '2022': '72.1', '2023': '95.4', '2024': '118.0', '2025': '145.2' } },
  { label: 'Interest & Similar Expense', values: { '2021': '-12.1', '2022': '-13.8', '2023': '-20.9', '2024': '-26.8', '2025': '-33.2' } },
  { label: 'Net Interest Income', isTotal: true, values: { '2021': '42.1', '2022': '58.3', '2023': '74.5', '2024': '91.2', '2025': '112.0' } },
  { label: 'Fees & Commission Income', indent: true, values: { '2021': '18.2', '2022': '24.0', '2023': '31.5', '2024': '40.1', '2025': '50.2' } },
  { label: 'Trading & Other Operating Income', indent: true, values: { '2021': '10.2', '2022': '12.1', '2023': '17.5', '2024': '22.7', '2025': '28.3' } },
  { label: 'Total Non-Interest Income', isTotal: true, values: { '2021': '28.4', '2022': '36.1', '2023': '49.0', '2024': '62.8', '2025': '78.5' } },
  { label: 'Total Operating Income', isHeader: true, values: { '2021': '70.5', '2022': '94.4', '2023': '123.5', '2024': '154.0', '2025': '190.5' } },
  { label: 'Staff & Personnel Expenses', indent: true, values: { '2021': '-20.1', '2022': '-25.4', '2023': '-32.0', '2024': '-39.2', '2025': '-48.0' } },
  { label: 'Administrative & Other Expenses', indent: true, values: { '2021': '-18.1', '2022': '-22.6', '2023': '-29.2', '2024': '-36.2', '2025': '-44.1' } },
  { label: 'Operating Expenses', isTotal: true, values: { '2021': '-38.2', '2022': '-48.0', '2023': '-61.2', '2024': '-75.4', '2025': '-92.1' } },
  { label: 'Impairment Losses on Financial Assets', values: { '2021': '-0.0', '2022': '-0.0', '2023': '-0.0', '2024': '-0.0', '2025': '-0.0' } },
  { label: 'Profit Before Tax', isHeader: true, values: { '2021': '32.3', '2022': '46.4', '2023': '62.3', '2024': '78.6', '2025': '98.4' } },
  { label: 'Income Tax Expense', values: { '2021': '-7.5', '2022': '-11.2', '2023': '-14.5', '2024': '-18.5', '2025': '-23.2' } },
  { label: 'Profit After Tax (Net Income)', isTotal: true, values: { '2021': '24.8', '2022': '35.2', '2023': '47.8', '2024': '60.1', '2025': '75.2' } },
];

const BS_DATA: FinancialRow[] = [
  { label: 'ASSETS', isHeader: true, values: { '2021': '', '2022': '', '2023': '', '2024': '', '2025': '' } },
  { label: 'Cash & Balances with Central Bank', indent: true, values: { '2021': '85.0', '2022': '110.2', '2023': '145.0', '2024': '180.5', '2025': '225.0' } },
  { label: 'Investment Securities', indent: true, values: { '2021': '120.4', '2022': '155.0', '2023': '198.2', '2024': '240.0', '2025': '295.0' } },
  { label: 'Loans & Advances to Customers', indent: true, values: { '2021': '210.0', '2022': '285.4', '2023': '360.0', '2024': '445.2', '2025': '550.0' } },
  { label: 'Property, Plant & Equipment', indent: true, values: { '2021': '45.2', '2022': '51.0', '2023': '58.4', '2024': '69.1', '2025': '88.0' } },
  { label: 'Other Assets', indent: true, values: { '2021': '19.4', '2022': '18.4', '2023': '18.4', '2024': '25.2', '2025': '42.0' } },
  { label: 'Total Assets', isTotal: true, values: { '2021': '480.0', '2022': '620.0', '2023': '780.0', '2024': '960.0', '2025': '1200.0' } },
  { label: 'LIABILITIES & EQUITY', isHeader: true, values: { '2021': '', '2022': '', '2023': '', '2024': '', '2025': '' } },
  { label: 'Customer Deposits', indent: true, values: { '2021': '350.0', '2022': '455.0', '2023': '570.0', '2024': '710.0', '2025': '890.0' } },
  { label: 'Other Liabilities', indent: true, values: { '2021': '35.0', '2022': '37.0', '2023': '45.0', '2024': '45.0', '2025': '50.0' } },
  { label: 'Total Liabilities', isTotal: true, values: { '2021': '385.0', '2022': '492.0', '2023': '615.0', '2024': '755.0', '2025': '940.0' } },
  { label: 'Share Capital & Reserves', indent: true, values: { '2021': '40.0', '2022': '40.0', '2023': '40.0', '2024': '40.0', '2025': '40.0' } },
  { label: 'Retained Earnings', indent: true, values: { '2021': '55.0', '2022': '88.0', '2023': '125.0', '2024': '165.0', '2025': '220.0' } },
  { label: 'Total Equity', isTotal: true, values: { '2021': '95.0', '2022': '128.0', '2023': '165.0', '2024': '205.0', '2025': '260.0' } },
  { label: 'Total Liabilities & Equity', isHeader: true, values: { '2021': '480.0', '2022': '620.0', '2023': '780.0', '2024': '960.0', '2025': '1200.0' } },
];

const CF_DATA: FinancialRow[] = [
  { label: 'Cash Flow from Operating Activities', values: { '2021': '31.2', '2022': '42.0', '2023': '55.4', '2024': '68.0', '2025': '84.5' } },
  { label: 'Cash Flow from Investing Activities', values: { '2021': '-12.0', '2022': '-18.5', '2023': '-22.0', '2024': '-28.0', '2025': '-35.0' } },
  { label: 'Cash Flow from Financing Activities', values: { '2021': '-8.5', '2022': '-11.0', '2023': '-14.2', '2024': '-18.0', '2025': '-22.5' } },
  { label: 'Net Increase in Cash & Cash Equivalents', isTotal: true, values: { '2021': '10.7', '2022': '12.5', '2023': '19.2', '2024': '22.0', '2025': '27.0' } },
  { label: 'Cash & Cash Equivalents at Beginning of Year', indent: true, values: { '2021': '74.3', '2022': '85.0', '2023': '97.5', '2024': '116.7', '2025': '138.7' } },
  { label: 'Cash & Cash Equivalents at End of Year', isHeader: true, values: { '2021': '85.0', '2022': '97.5', '2023': '116.7', '2024': '138.7', '2025': '165.7' } },
];

const SOCE_DATA: FinancialRow[] = [
  { label: 'Opening Total Equity', isHeader: true, values: { '2021': '78.2', '2022': '95.0', '2023': '128.0', '2024': '165.0', '2025': '205.0' } },
  { label: 'Profit for the Year', indent: true, values: { '2021': '24.8', '2022': '35.2', '2023': '47.8', '2024': '60.1', '2025': '75.2' } },
  { label: 'Dividends Paid', indent: true, values: { '2021': '-8.0', '2022': '-2.2', '2023': '-10.8', '2024': '-20.1', '2025': '-20.2' } },
  { label: 'Other Comprehensive Income / Transfers', indent: true, values: { '2021': '0.0', '2022': '0.0', '2023': '0.0', '2024': '0.0', '2025': '0.0' } },
  { label: 'Closing Total Equity', isTotal: true, values: { '2021': '95.0', '2022': '128.0', '2023': '165.0', '2024': '205.0', '2025': '260.0' } },
];

interface CompanyItem {
  id: string;
  name: string;
  ticker: string;
  country: string;
  sector: string;
  hasData: boolean;
}

interface CountryFolder {
  country: string;
  companies: CompanyItem[];
}

const DIRECTORY: CountryFolder[] = [
  {
    country: 'Zimbabwe',
    companies: [
      { id: 'cbz', name: 'CBZ Holdings', ticker: 'CBZ.zw', country: 'Zimbabwe', sector: 'Banking & Financial Services', hasData: true },
      { id: 'delta', name: 'Delta Corporation', ticker: 'DLTA.zw', country: 'Zimbabwe', sector: 'Consumer Goods', hasData: false },
      { id: 'econet', name: 'Econet Wireless Zimbabwe', ticker: 'ECO.zw', country: 'Zimbabwe', sector: 'Telecommunications', hasData: false },
    ],
  },
];

export default function DataPage() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem>(DIRECTORY[0].companies[0]);
  const [activeTab, setActiveTab] = useState<StatementTab>('pnl');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCountry, setOpenCountry] = useState<string>('Zimbabwe');

  const getActiveDataset = () => {
    switch (activeTab) {
      case 'pnl':
        return PNL_DATA;
      case 'bs':
        return BS_DATA;
      case 'cf':
        return CF_DATA;
      case 'soce':
        return SOCE_DATA;
      default:
        return PNL_DATA;
    }
  };

  const filteredDirectory = DIRECTORY.map((folder) => {
    const matchingCompanies = folder.companies.filter((comp) =>
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.sector.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...folder, companies: matchingCompanies };
  }).filter((folder) => folder.companies.length > 0);

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

            {filteredDirectory.length === 0 ? (
              <p className="text-xs text-[#667085] py-2">No matching companies found.</p>
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
                            selectedCompany.id === comp.id
                              ? 'bg-[#0F8B8D] text-white font-semibold'
                              : 'text-[#273142] hover:bg-gray-200/60'
                          }`}
                        >
                          <span>{comp.name}</span>
                          {!comp.hasData && (
                            <span className="text-[10px] text-[#667085] italic">Soon</span>
                          )}
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
                {selectedCompany.country} • {selectedCompany.sector} • Reporting Currency: <span className="text-[#1E2430] font-medium">USD / ZWG (Millions)</span>
              </p>
            </div>

            <div className="text-xs text-[#667085] bg-white px-3 py-2 rounded border border-gray-200 shadow-sm">
              Standardized View • 5-Year Spread
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
          {!selectedCompany.hasData ? (
            <div className="bg-[#F8FAFC] border border-gray-200 p-12 text-center rounded-lg">
              <p className="text-[#667085] text-sm">
                Financial data for <span className="text-[#1E2430] font-semibold">{selectedCompany.name}</span> is currently being parsed and will be published shortly.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#F8FAFC] text-xs font-bold text-[#273142]">
                    <th className="p-3 sticky left-0 bg-[#F8FAFC] min-w-[280px] border-r border-gray-200">
                      Line Item (USD / ZWG Millions)
                    </th>
                    {YEARS.map((year) => (
                      <th key={year} className="p-3 text-right min-w-[100px]">
                        FY {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs font-mono">
                  {getActiveDataset().map((row, idx) => {
                    if (row.isHeader) {
                      return (
                        <tr key={idx} className="bg-[#F1F5F9] text-[#1E2430] font-bold">
                          <td className="p-3 sticky left-0 bg-[#F1F5F9] border-r border-gray-200 font-sans">
                            {row.label}
                          </td>
                          {YEARS.map((yr) => (
                            <td key={yr} className="p-3 text-right text-[#2F6FED]">
                              {row.values[yr]}
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
                          {YEARS.map((yr) => (
                            <td key={yr} className="p-3 text-right text-[#0F8B8D]">
                              {row.values[yr]}
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
                        {YEARS.map((yr) => (
                          <td key={yr} className="p-2.5 text-right">
                            {row.values[yr]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
