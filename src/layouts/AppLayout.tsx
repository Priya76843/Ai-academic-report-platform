import { Outlet } from "react-router-dom"
import Sidebar from "../components/common/Sidebar"
import Header from "../components/common/Header"
import PageContainer from "../components/common/PageContainer"

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header />

          <PageContainer>
            <Outlet />
          </PageContainer>
        </div>
      </div>
    </div>
  )
}

export default AppLayout