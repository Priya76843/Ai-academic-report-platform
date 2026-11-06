import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Job,
  Page,
  Project,
  ReportPlan,
  SourcesList,
  User,
} from "./types";

export const queries = {
  me: () =>
    queryOptions({
      queryKey: ["me"],
      queryFn: () => api<User>("/auth/me"),
      retry: false,
      staleTime: 60_000,
    }),

  projects: (page = 1) =>
    queryOptions({
      queryKey: ["projects", page],
      queryFn: () =>
        api<Page<Project>>(`/projects?page=${page}&page_size=20`),
    }),

  project: (id: string) =>
    queryOptions({
      queryKey: ["project", id],
      queryFn: () => api<Project>(`/projects/${id}`),
    }),

  sources: (id: string) =>
    queryOptions({
      queryKey: ["sources", id],
      queryFn: () => api<SourcesList>(`/projects/${id}/sources`),
    }),

  plan: (id: string) =>
    queryOptions({
      queryKey: ["plan", id],
      queryFn: () => api<ReportPlan>(`/projects/${id}/plan`),
      retry: false,
    }),

  job: (id: string) =>
    queryOptions({
      queryKey: ["job", id],
      queryFn: () => api<Job>(`/jobs/${id}`),
    }),
};
