import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'Simply Leased Automations',
  description: "Run and monitor your team's automations in one place.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
