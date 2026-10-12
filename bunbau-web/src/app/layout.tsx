import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { PortfolioProvider } from '../contexts/PortfolioContext';

export const metadata = {
  title: 'BunBau (資本寶)',
  description: 'Personal portfolio intelligence application.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('bunbau_theme');
                  var isDark = true;
                  if (stored === 'light') {
                    isDark = false;
                  } else if (stored === 'dark') {
                    isDark = true;
                  } else if (stored === 'system') {
                    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  } else {
                    // Default to dark or system
                    isDark = true;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <PortfolioProvider>
            {children}
          </PortfolioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
