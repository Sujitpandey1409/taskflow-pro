export const queryKeys = {
  members: (orgId?: string) => ["members", orgId ?? "no-org"] as const,
  projects: (orgId?: string) => ["projects", orgId ?? "no-org"] as const,
  tasks: (orgId?: string) => ["tasks", orgId ?? "no-org"] as const,
};
