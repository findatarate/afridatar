'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type DataTab = 'overview' | 'management' | 'pnl' | 'bs' | 'soce' | 'cf' | 'ratios';

interface Company {
  id: string;
  ticker: string;
  name: string;
  country?: string;
  sector?: string;
  website?: string;
  email?: string;
  registered_address?: string;
  postal_address?: string;
  telephone?: string;
  branches?: string;
  workforce?: string;
  listings?: string;
  nature_of_operations?: string;
  products_services?: string;
  markets_served?: string;
  market_share?: string;
}

interface Director {
  id: string;
  person_name: string;
  role_title: string;
  board_committees?: string;
  appointed_date?: string;
  profile?: string;
  other_directorships?: string;
  category: 'Board' | 'Executive';
}

interface Shareholder {
  id: string;
  shareholder_name: string;
  percentage: string;
  reporting_date?: string;
}

interface Subsidiary {
  id: string;
  subsidiary_name: string;
  shareholding_pct?: string;
  purpose?: string;
}

interface CreditRating {
  id: string;
  entity_name: string;
  rating: string;
}

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<DataTab>('overview');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [directors, setDirectors] = useState<Director[]>([]);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [ratings, setRatings] = useState<CreditRating[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Fetch initial list of companies
  useEffect(() => {
    async function loadCompanies() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('companies').select('*').order('name');
        if (error) throw error;
        
        if (data && data.length > 0) {
          setCompanies(data);
          setSelectedCompany(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  // Fetch details for the selected company with non-null guard clause
  useEffect(() => {
    async function fetchCompanyDetails() {
      // Guard Clause: Prevent running queries if selectedCompany is null
      if (!selectedCompany) return;

      const companyId = selectedCompany.id; // Safely extracted non-null string
      setDetailsLoading(true);

      try {
        const [subRes, ratRes, shRes, mgmtRes] = await Promise.all([
          supabase.from('subsidiaries').select('*').eq('company_id', companyId),
          supabase.from('credit_ratings').select('*').eq('company_id', companyId),
          supabase.from('shareholders').select('*').eq('company_id', companyId),
          supabase.from('directors').select('*').eq('company_id', companyId),
        ]);

        setSubsidiaries(subRes.data || []);
        setRatings(ratRes.data || []);
        setShareholders(shRes.data || []);
        setDirectors(mgmtRes.data || []);
      } catch (err) {
        console.error('Failed to load company details:', err);
      } finally {
        setDetailsLoading(false);
      }
    }

    fetchCompanyDetails();
  }, [selectedCompany]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-gray-500 font-medium">Loading platform data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header & Company Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capital IQ Financial Intelligence</h1>
          <p className="text-sm text-gray-500">Listed African Corporate Data Platform</p>
        </div>

        <div className="flex items-center space-x-3">
          <label htmlFor="company-select" className="text-sm font-medium text-gray-700">
            Select Company:
          </label>
          <select
            id="company-select"
            value={selectedCompany?.id || ''}
            onChange={(e) => {
              const found = companies.find((c) => c.id === e.target.value);
              setSelectedCompany(found || null);
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.ticker})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedCompany ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border">
          No company selected or database is empty. Upload data in the admin portal.
        </div>
      ) : (
        <>
          {/* Company Title Header */}
          <div className="bg-slate-900 text-white p-6 rounded-lg shadow space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
                <p className="text-slate-400 text-sm">{selectedCompany.ticker} | {selectedCompany.sector || 'Financial Services'} | {selectedCompany.country || 'Zimbabwe'}</p>
              </div>
              <Link href="/admin" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-200 border border-slate-700">
                Admin Upload
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6 overflow-x-auto">
              {[
                { key: 'overview', label: 'Company Overview' },
                { key: 'management', label: 'Board & Management' },
                { key: 'pnl', label: 'Income Statement' },
                { key: 'bs', label: 'Balance Sheet' },
                { key: 'soce', label: 'Changes in Equity' },
                { key: 'cf', label: 'Cash Flow' },
                { key: 'ratios', label: 'Financial Ratios' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as DataTab)}
                  className={`py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content Sections */}
          {detailsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading company details...</div>
          ) : (
            <div className="space-y-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border space-y-4">
                      <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Business Operations</h3>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div>
                          <span className="font-semibold text-gray-900 block">Nature of Operations:</span>
                          <p>{selectedCompany.nature_of_operations || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">Products & Services:</span>
                          <p>{selectedCompany.products_services || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">Markets Served:</span>
                          <p>{selectedCompany.markets_served || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Shareholders */}
                    <div className="bg-white p-6 rounded-lg shadow border space-y-4">
                      <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Major Shareholders</h3>
                      {shareholders.length === 0 ? (
                        <p className="text-sm text-gray-500">No shareholder data available.</p>
                      ) : (
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-700">
                            <tr>
                              <th className="p-2">Shareholder Name</th>
                              <th className="p-2 text-right">Holding %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {shareholders.map((s) => (
                              <tr key={s.id}>
                                <td className="p-2 font-medium">{s.shareholder_name}</td>
                                <td className="p-2 text-right">{s.percentage}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Sidebar Metadata */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border space-y-3 text-sm">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Corporate Information</h3>
                      <div>
                        <span className="text-gray-500 block">Website:</span>
                        <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {selectedCompany.website || 'N/A'}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Email:</span>
                        <span>{selectedCompany.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Address:</span>
                        <span>{selectedCompany.registered_address || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Workforce:</span>
                        <span>{selectedCompany.workforce || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Subsidiaries */}
                    <div className="bg-white p-6 rounded-lg shadow border space-y-3 text-sm">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Subsidiaries</h3>
                      {subsidiaries.length === 0 ? (
                        <p className="text-xs text-gray-500">No subsidiaries listed.</p>
                      ) : (
                        <ul className="divide-y text-xs">
                          {subsidiaries.map((sub) => (
                            <li key={sub.id} className="py-2 flex justify-between">
                              <span className="font-medium">{sub.subsidiary_name}</span>
                              <span className="text-gray-500">{sub.shareholding_pct}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MANAGEMENT */}
              {activeTab === 'management' && (
                <div className="bg-white p-6 rounded-lg shadow border space-y-6">
                  <h3 className="font-bold text-lg text-gray-900 border-b pb-2">Board of Directors & Executive Management</h3>
                  {directors.length === 0 ? (
                    <p className="text-sm text-gray-500">No management records found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="p-3 border">Name</th>
                            <th className="p-3 border">Role / Title</th>
                            <th className="p-3 border">Category</th>
                            <th className="p-3 border">Board Committees</th>
                            <th className="p-3 border">Appointed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {directors.map((d) => (
                            <tr key={d.id} className="hover:bg-gray-50">
                              <td className="p-3 border font-semibold">{d.person_name}</td>
                              <td className="p-3 border">{d.role_title}</td>
                              <td className="p-3 border">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${d.category === 'Board' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {d.category}
                                </span>
                              </td>
                              <td className="p-3 border text-xs">{d.board_committees || '-'}</td>
                              <td className="p-3 border text-xs">{d.appointed_date || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TABS 3-7: FINANCIAL STATEMENTS PLACEHOLDERS */}
              {['pnl', 'bs', 'soce', 'cf', 'ratios'].includes(activeTab) && (
                <div className="bg-white p-6 rounded-lg shadow border space-y-4">
                  <h3 className="font-bold text-lg text-gray-900 border-b pb-2 capitalize">
                    {activeTab === 'pnl' && 'Income Statement (P&L)'}
                    {activeTab === 'bs' && 'Balance Sheet'}
                    {activeTab === 'soce' && 'Statement of Changes in Equity'}
                    {activeTab === 'cf' && 'Cash Flow Statement'}
                    {activeTab === 'ratios' && 'Financial Ratios & Metrics'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Financial statement data for <span className="font-semibold">{selectedCompany.name}</span> is imported. Display grid loads line items dynamically by period.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
