import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "../components/common/Sidebar"
import Header from "../components/common/Header"
import PageContainer from "../components/common/PageContainer"

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setMobileMenuOpen(true)} />

          <PageContainer>
            <Outlet />
          </PageContainer>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation"
          />

          {/* Drawer */}
          <div className="relative h-full w-72 shadow-xl">
            <Sidebar mobile onClose={closeMobileMenu} />
          </div>
        </div>
      )}
    </div>
  )
}

export default AppLayout