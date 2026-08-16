import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AfriDatar - African Financial Intelligence',
  description: 'Standardized side-by-side corporate financial spreads across Africa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    
      {children}
    
  );
}
