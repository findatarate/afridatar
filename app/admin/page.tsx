'use client';

import Link from 'next/link';
import { useState } from 'react';

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCompany, setTargetCompany] = useState('CBZ Holdings');
  const [targetCountry, setTargetCountry] = useState('Zimbabwe');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus(`Successfully parsed "${selectedFile.name}" and imported statements for ${targetCompany} (${targetCountry}).`);
      setSelectedFile(null);
    }, 1500);
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
            📊 Upload Financial Spreads (Excel)
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

        {/* TAB 1: EXCEL UPLOAD */}
        {activeTab === 'upload' && (
          <div className="bg-[#F8FAFC] border border-gray-200 p-6 rounded-xl max-w-2xl shadow-sm">
            <h2 className="text-xl font-bold text-[#1E2430] mb-1">Import Excel Financial Spreads</h2>
            <p className="text-xs text-[#667085] mb-6">
              Upload an Excel workbook containing standardized tabs (<code className="text-[#0F8B8D]">P&L</code>, <code className="text-[#0F8B8D]">BS</code>, <code className="text-[#0F8B8D]">CF</code>, <code className="text-[#0F8B8D]">SOCE</code>) to update the live dataset.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#667085] block mb-1">Target Country</label>
                  <input
                    type="text"
                    required
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#667085] block mb-1">Target Company</label>
                  <input
                    type="text"
                    required
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-xs text-[#1E2430] focus:outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div>
                <label className="text-xs font-semibold text-[#667085] block mb-1">Excel File (.xlsx, .xls)</label>
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
                      {selectedFile ? selectedFile.name : 'Click to select or drag and drop an Excel file'}
                    </span>
                    <span className="text-[10px] text-[#667085]">Supports multi-tab financial templates</span>
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
                {isUploading ? 'Parsing & Uploading Data...' : 'Upload & Publish Spreads'}
              </button>
            </form>

            {uploadStatus && (
              <div className="mt-4 p-3 bg-[#0F8B8D]/15 border border-[#0F8B8D]/30 rounded text-xs text-[#0F8B8D] font-medium">
                {uploadStatus}
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
