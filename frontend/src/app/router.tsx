import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./shells/AppShell";
import { SignInPage } from "@/features/auth/SignInPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { NewProjectPage } from "@/features/projects/NewProjectPage";
import { ReportDetailsPage } from "@/features/projects/ReportDetailsPage";
import { Placeholder } from "@/features/projects/Placeholder";
import { SourcesPage } from "@/features/projects/SourcesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/projects" replace />,
  },
  {
    path: "/login",
    element: <SignInPage />,
  },
  {
    path: "/register",
    element: <SignInPage mode="register" />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/projects",
            element: <ProjectsPage />,
          },
          {
            path: "/projects/new",
            element: <NewProjectPage />,
          },
          {
            path: "/projects/:projectId/setup",
            element: <ReportDetailsPage />,
          },
          {
            path: "/projects/:projectId/sources",
            element: <SourcesPage />,
          },
          {
            path: "/projects/:projectId/plan",
            element: <Placeholder screen="Report plan" ticket="F-07" />,
          },
          {
            path: "/projects/:projectId/sections",
            element: <Placeholder screen="Sections" ticket="F-08" />,
          },
          {
            path: "/projects/:projectId/sections/:sectionId",
            element: <Placeholder screen="Chapter editor" ticket="F-08" />,
          },
          {
            path: "/projects/:projectId/final-review",
            element: <Placeholder screen="Final review" ticket="F-12" />,
          },
          {
            path: "/projects/:projectId/export",
            element: <Placeholder screen="Export" ticket="F-09" />,
          },
        ],
      },
    ],
  },
]);
