import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./shells/AppShell";
import { SignInPage } from "@/features/auth/SignInPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { NewProjectPage } from "@/features/projects/NewProjectPage";
import { Placeholder } from "@/features/projects/Placeholder";

// Route configuration follows the application architecture in §13.1.
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/projects" replace /> },
  { path: "/login", element: <SignInPage /> },
  { path: "/register", element: <SignInPage mode="register" /> },
  {
    element: <AppShell />,
    children: [
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/projects/new", element: <NewProjectPage /> },
      {
        path: "/projects/:projectId/setup",
        element: <Placeholder screen="Report details" ticket="F-05" />,
      },
      {
        path: "/projects/:projectId/sources",
        element: <Placeholder screen="Sources" ticket="F-06" />,
      },
      {
        path: "/projects/:projectId/plan",
        element: <Placeholder screen="Report plan" ticket="F-07" />,
      },
      {
        path: "/projects/:projectId/sections/:sectionId",
        element: <Placeholder screen="Chapter editor" ticket="F-08" />,
      },
      {
        path: "/projects/:projectId/final-review",
        element: (
          <Placeholder
            screen="Final review"
            ticket="F-12 (slice 2+)"
          />
        ),
      },
      {
        path: "/projects/:projectId/export",
        element: <Placeholder screen="Export" ticket="F-09" />,
      },
    ],
  },
]);
