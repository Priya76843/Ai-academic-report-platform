import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/Landing/LandingPage"
import Login from "./components/Login"
import AppLayout from "./layouts/AppLayout"
import DashboardPage from "./pages/Dashboard/DashboardPage"
import ProjectsPage from "./pages/Projects/ProjectsPage"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Application routes */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
export default App