'use client';

import Link from 'next/link';
import { useState } from 'react';

// --- Types ---
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

// --- Mock Initial Data ---
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
  
  // Subscriber & Suggestion State
  const [subscribers] = useState<Subscriber[]>(MOCK_SUBSCRIBERS);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCompany, setTargetCompany] = useState('CBZ Holdings');
  const [targetCountry, setTargetCountry] = useState('Zimbabwe');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  // Handle Excel Upload Submission
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    // Simulate Excel parsing & ingestion delay
    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus(`Successfully parsed "${selectedFile.name}" and imported statements for ${targetCompany} (${targetCountry}).`);
      setSelectedFile(null);
    }, 1500);
  };

  // Update Suggestion Status
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
    <div className="min-h-screen bg-[#222831] text-white flex flex-col font-sans">
      {/* Admin Header */}
      <header className="border-b border-gray-800 bg-[#0B2D52] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-[#D4A437] tracking-tight hover:opacity-90 transition-opacity">
            AfriDatar
          </Link>
          <span className="text-xs bg-[#D4A437] text-[#222831] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
            Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/data" className="text-gray-300 hover:text-[#D4A437] transition-colors">
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
        <div className="border-b border-gray-800 flex gap-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[#D4A437] text-[#D4A437]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            📊 Upload Financial Spreads (Excel)
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'subscribers'
                ? 'border-[#D4A437] text-[#D4A437]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            📬 Subscribers ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-[#D4A437] text-[#D4A437]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            💡 Company Requests ({suggestions.length})
          </button>
        </div>

        {/* TAB 1: EXCEL UPLOAD PANEL */}
        {activeTab === 'upload' && (
          <div className="bg-[#0B2D52]/30 border border-gray-800 p-6 rounded-xl max-w-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Import Excel Financial Spreads</h2>
            <p className="text-xs text-gray-400 mb-6">
              Upload an Excel workbook containing standardized tabs (<code className="text-[#D4A437]">P&L</code>, <code className="text-[#D4A437]">BS</code>, <code className="text-[#D4A437]">CF</code>, <code className="text-[#D4A437]">SOCE</code>) to update the live dataset.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Target Country</label>
                  <input
                    type="text"
                    required
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#222831] border border-gray-700 text-xs text-white focus:outline-none focus:border-[#D4A437]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Target Company</label>
                  <input
                    type="text"
                    required
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#222831] border border-gray-700 text-xs text-white focus:outline-none focus:border-[#D4A437]"
                  />
                </div>
              </div>

              {/* Drag and Drop Box */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Excel File (.xlsx, .xls)</label>
                <div className="border-2 border-dashed border-gray-700 hover:border-[#0F7B5F] bg-[#222831] rounded-lg p-6 text-center transition-colors">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <span className="text-3xl">📁</span>
                    <span className="text-xs text-gray-300 font-medium">
                      {selectedFile ? selectedFile.name : 'Click to select or drag and drop an Excel file'}
                    </span>
                    <span className="text-[10px] text-gray-500">Supports multi-tab financial templates</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className={`w-full py-2.5 rounded-md font-semibold text-xs transition-colors ${
                  !selectedFile || isUploading
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0F7B5F] hover:bg-[#0c634c] text-white'
                }`}
              >
                {isUploading ? 'Parsing & Uploading Data...' : 'Upload & Publish Spreads'}
              </button>
            </form>

            {uploadStatus && (
              <div className="mt-4 p-3 bg-[#0F7B5F]/20 border border-[#0F7B5F]/40 rounded text-xs text-[#0F7B5F] font-medium">
                {uploadStatus}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUBSCRIBERS TABLE */}
        {activeTab === 'subscribers' && (
          <div className="bg-[#0B2D52]/20 border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white">Email Notification Subscribers</h2>
              <span className="text-xs text-gray-400">Total: {subscribers.length}</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B2D52] text-xs font-semibold text-gray-300 border-b border-gray-800">
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Subscription Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-xs">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-800/30 text-gray-300">
                    <td className="p-3 font-mono text-white">{sub.email}</td>
                    <td className="p-3 text-gray-400">{sub.subscribedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: COMPANY REQUESTS TABLE */}
        {activeTab === 'suggestions' && (
          <div className="bg-[#0B2D52]/20 border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white">User-Suggested Companies</h2>
              <span className="text-xs text-gray-400">Click status to toggle</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B2D52] text-xs font-semibold text-gray-300 border-b border-gray-800">
                  <th className="p-3">Company Name</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Requester Email</th>
                  <th className="p-3">Requested Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-xs">
                {suggestions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/30 text-gray-300">
                    <td className="p-3 font-bold text-white">{s.companyName}</td>
                    <td className="p-3 text-[#D4A437]">{s.country}</td>
                    <td className="p-3 font-mono">{s.email}</td>
                    <td className="p-3 text-gray-400">{s.requestedAt}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleSuggestionStatus(s.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          s.status === 'Completed'
                            ? 'bg-[#0F7B5F]/20 text-[#0F7B5F] border border-[#0F7B5F]/40'
                            : s.status === 'In Progress'
                            ? 'bg-[#D4A437]/20 text-[#D4A437] border border-[#D4A437]/40'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
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
