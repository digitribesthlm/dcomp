import TopBar from '../../components/TopBar'
import SideNav from '../../components/SideNav'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
