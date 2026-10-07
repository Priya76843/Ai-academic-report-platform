import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./pages/Landing/LandingPage"
import Login from "./components/Login"
import AppLayout from "./layouts/AppLayout"
import DashboardPage from "./pages/Dashboard/DashboardPage"
import ProjectsPage from "./pages/Projects/ProjectsPage"
import NewProjectForm from "./components/projects/NewProjectForm"

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

          <Route
            path="/projects/new"
            element={
              <div>
                <h1 className="text-2xl font-bold text-gray-950">
                  New Project
                </h1>

                <p className="mt-2 text-sm text-gray-600">
                  Create a new academic report project.
                </p>

                <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <NewProjectForm />
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App