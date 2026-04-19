"use client";

import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Building2, Lock, Shield, Workflow } from "lucide-react";

const settingsCards = [
  {
    icon: Building2,
    title: "Organization profile",
    description: "Workspace name, slug, and branding controls can live here once organization editing is added.",
  },
  {
    icon: Shield,
    title: "Roles and access",
    description: "Tie role changes to the membership model so admins and members can be managed safely.",
  },
  {
    icon: Lock,
    title: "Authentication",
    description: "Later we can centralize deployment-safe auth handling and cross-domain cookie strategy here.",
  },
];

export default function SettingsPage() {
  const { currentOrg, user } = useAuthStore();

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Settings</h1>
        <p className="mt-2 text-base text-gray-600 sm:text-lg">
          A clean home for workspace configuration as the product matures.
        </p>
      </div>

      <Card className="border-gray-200 p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          <Workflow className="h-4 w-4" />
          Current workspace snapshot
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Organization</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{currentOrg?.name ?? "Not loaded"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Workspace slug</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{currentOrg?.slug ?? "Not loaded"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{user?.email ?? "Not loaded"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        {settingsCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-gray-200 p-6 shadow-sm">
              <Icon className="h-8 w-8 text-indigo-600" />
              <h2 className="mt-5 text-xl font-semibold text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.description}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
