import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AfriDatar - African Financial Intelligence',
  description: 'Standardized side-by-side corporate financial spreads across Africa.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
