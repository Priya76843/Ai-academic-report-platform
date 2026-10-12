import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import type { Job, Page, Project, User } from "./types";

export const queries = {
  me: () => queryOptions({ queryKey: ["me"], queryFn: () => api<User>("/auth/me"), retry: false, staleTime: 60_000 }),
  projects: (page = 1) => queryOptions({ queryKey: ["projects", page], queryFn: () => api<Page<Project>>(`/projects?page=${page}&page_size=20`) }),
  project: (id: string) => queryOptions({ queryKey: ["project", id], queryFn: () => api<Project>(`/projects/${id}`) }),
  job: (id: string) => queryOptions({ queryKey: ["job", id], queryFn: () => api<Job>(`/jobs/${id}`) }),
};
