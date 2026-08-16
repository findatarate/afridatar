'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [subEmail, setSubEmail] = useState('');
  const [subSubmitted, setSubSubmitted] = useState(false);

  const [suggestCompany, setSuggestCompany] = useState('');
  const [suggestCountry, setSuggestCountry] = useState('');
  const [suggestEmail, setSuggestEmail] = useState('');
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (subEmail) setSubSubmitted(true);
  };

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestCompany && suggestCountry && suggestEmail) {
      setSuggestSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#222831] text-white flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex justify-between items-center max-w-5xl mx-auto w-full">
        <span className="text-2xl font-bold tracking-tight text-[#D4A437]">
          AfriDatar
        </span>
        <Link
          href="/data"
          className="bg-[#0F7B5F] hover:bg-[#0c634c] text-white px-5 py-2 rounded-md font-semibold text-sm transition-colors"
        >
          Browse Data Library →
        </Link>
      </header>

      {/* Main Hero Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center items-center text-center">
        {/* Title */}
        <h1 className="text-6xl md:text-8xl font-extrabold text-[#D4A437] tracking-tight mb-4">
          AfriDatar
        </h1>

        {/* Tagline */}
        <h2 className="text-xl md:text-3xl font-semibold text-gray-200 mb-6 max-w-3xl leading-snug">
          Standardized side-by-side corporate financial spreads across Africa
        </h2>

        {/* Description */}
        <p className="text-base md:text-lg text-gray-400 mb-10 max-w-2xl leading-relaxed">
          <span className="text-[#0F7B5F] font-bold">100% free access.</span> Our database is continually growing as we parse and add new financial statements and data points across African markets.
        </p>

        {/* Single Link to Second Page */}
        <Link
          href="/data"
          className="bg-[#0B2D52] hover:bg-[#092340] border border-[#D4A437] text-white text-lg font-bold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mb-16 inline-block"
        >
          Browse Data Library
        </Link>

        {/* Engagement Cards (Subscribe + Suggest) */}
        <div className="grid md:grid-cols-2 gap-8 w-full text-left">
          {/* Subscribe Box */}
          <div className="bg-[#0B2D52]/40 border border-gray-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-1">Subscribe for Updates</h3>
            <p className="text-xs text-gray-400 mb-4">
              Get notified whenever a new company or quarterly report is uploaded.
            </p>
            {subSubmitted ? (
              <p className="text-sm text-[#0F7B5F] font-semibold py-2">Thank you for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-[#222831] border border-gray-700 text-sm text-white focus:outline-none focus:border-[#D4A437]"
                />
                <button
                  type="submit"
                  className="w-full bg-[#0F7B5F] hover:bg-[#0c634c] text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {/* Suggest a Company Box */}
          <div className="bg-[#0B2D52]/40 border border-gray-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-1">Suggest a Company</h3>
            <p className="text-xs text-gray-400 mb-4">
              Tell us which company you want us to cover next.
            </p>
            {suggestSubmitted ? (
              <p className="text-sm text-[#0F7B5F] font-semibold py-2">Suggestion received. Thank you!</p>
            ) : (
              <form onSubmit={handleSuggest} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Company Name"
                  value={suggestCompany}
                  onChange={(e) => setSuggestCompany(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-[#222831] border border-gray-700 text-sm text-white focus:outline-none focus:border-[#D4A437]"
                />
                <input
                  type="text"
                  required
                  placeholder="Country"
                  value={suggestCountry}
                  onChange={(e) => setSuggestCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-[#222831] border border-gray-700 text-sm text-white focus:outline-none focus:border-[#D4A437]"
                />
                <input
                  type="email"
                  required
                  placeholder="Contact Email"
                  value={suggestEmail}
                  onChange={(e) => setSuggestEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-md bg-[#222831] border border-gray-700 text-sm text-white focus:outline-none focus:border-[#D4A437]"
                />
                <button
                  type="submit"
                  className="w-full bg-[#0B2D52] hover:bg-[#092340] border border-gray-700 text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
                >
                  Submit Suggestion
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center">
        <Link
          href="/admin"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Admin Portal
        </Link>
      </footer>
    </div>
  );
}
