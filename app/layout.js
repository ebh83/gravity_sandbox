import './globals.css';

export const metadata = {
  title: 'Gravity Sandbox',
  description: 'Create and simulate orbital systems with realistic physics',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
