import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Competition Dashboard",
  description: "HubSpot-style dashboard for competitor insights",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-hubspotGray text-hubspotBlue`}>
        <div className="flex min-h-screen">
          <aside className="w-64 bg-white border-r border-gray-100 hidden md:block">
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
              <span className="text-hubspotOrange font-bold">dComp</span>
            </div>
            <nav className="p-4 space-y-1 text-sm">
              <a className="block px-3 py-2 rounded hover:bg-hubspotGray" href="/">Dashboard</a>
              <a className="block px-3 py-2 rounded hover:bg-hubspotGray" href="/competitors">Competitors</a>
            </nav>
          </aside>
          <main className="flex-1">
            <header className="bg-white border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="md:hidden p-2 rounded hover:bg-hubspotGray" aria-label="Open menu">☰</button>
                  <h1 className="text-xl font-semibold">Dashboard</h1>
                </div>
                <div className="flex items-center gap-3">
                  <input className="border border-gray-200 rounded px-3 py-2 text-sm w-56" placeholder="Search" />
                  <div className="w-8 h-8 rounded-full bg-hubspotTeal/20 flex items-center justify-center text-hubspotTeal font-bold">A</div>
                </div>
              </div>
            </header>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
