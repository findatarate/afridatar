'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setMessage(data.message || 'Workbook successfully imported!');
      setFile(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Upload failed.';
      setMessage(`Error: ${errMsg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Capital IQ Admin Portal</h1>
      
      <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Financial Workbook (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Processing & Importing...' : 'Import Workbook'}
        </button>

        {message && (
          <div className={`p-4 rounded text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
