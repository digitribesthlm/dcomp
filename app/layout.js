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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-br from-hubspotGray to-white text-hubspotBlue`}>
        <div className="flex min-h-screen">
          {/* Enhanced Sidebar */}
          <aside className="w-72 bg-white border-r border-gray-200 hidden md:block shadow-lg">
            <div className="h-20 flex items-center px-8 border-b border-gray-200 bg-gradient-to-r from-hubspotTeal to-hubspotBlue">
              <span className="text-white font-bold text-2xl">dComp</span>
              <span className="ml-2 text-white/80 text-sm">Analytics</span>
            </div>
            <nav className="p-6 space-y-2">
              <a className="group flex items-center px-4 py-3 rounded-xl hover:bg-hubspotTeal/10 transition-all duration-200" href="/">
                <svg className="w-5 h-5 mr-3 text-hubspotTeal group-hover:text-hubspotTeal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
                <span className="font-medium">Dashboard</span>
              </a>
              <a className="group flex items-center px-4 py-3 rounded-xl hover:bg-hubspotTeal/10 transition-all duration-200" href="/competitors">
                <svg className="w-5 h-5 mr-3 text-hubspotTeal group-hover:text-hubspotTeal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">Competitors</span>
              </a>
            </nav>
          </aside>
          
          <main className="flex-1">
            {/* Enhanced Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
              <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="md:hidden p-2 rounded-lg hover:bg-hubspotGray transition-colors" aria-label="Open menu">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Competitor Analytics</h1>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      className="border border-gray-300 rounded-xl px-4 py-2 pl-10 text-sm w-64 focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal transition-colors" 
                      placeholder="Global search..." 
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-hubspotTeal to-hubspotBlue flex items-center justify-center text-white font-bold shadow-lg">
                    A
                  </div>
                </div>
              </div>
            </header>
            
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
