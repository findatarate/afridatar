import './globals.css';

export const metadata = {
  title: 'AfriDatar - African Financial Intelligence',
  description: 'Standardized side-by-side corporate financial spreads across Africa.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
