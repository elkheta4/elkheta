import '../styles/global.css';

export const metadata = {
  title: 'Sales Dashboard',
  description: 'System React Base',
  icons: {
    icon: '/images/logo.webp',
    apple: '/images/logo.webp',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

import { AppProvider } from '@/context/AppContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('sidebar-visible');
                  if (saved === 'false') {
                    document.documentElement.classList.add('sidebar-hidden');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <AppProvider>
          <div id="root">{children}</div>
        </AppProvider>
      </body>
    </html>
  )
}
