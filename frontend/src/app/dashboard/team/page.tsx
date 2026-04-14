"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MailPlus, ShieldCheck, Users } from "lucide-react";

const roleGuide = [
  {
    title: "Owner",
    description: "Full control of the workspace, billing, invites, and organization-level decisions.",
  },
  {
    title: "Admin",
    description: "Can help manage projects, tasks, and most team workflows once invitation flow is automated.",
  },
  {
    title: "Member",
    description: "Works on assigned tasks and collaborates inside the organization workspace.",
  },
];

export default function TeamPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Team</h1>
          <p className="mt-2 text-lg text-gray-600">
            This workspace is ready for role-based collaboration. Member management is the next feature layer.
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Coming next</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {roleGuide.map((role) => (
          <Card key={role.title} className="border-gray-200 p-6 shadow-sm">
            <ShieldCheck className="mb-4 h-8 w-8 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">{role.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{role.description}</p>
          </Card>
        ))}
      </div>

      <Card className="border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-8 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
              <Users className="h-4 w-4" />
              Organization management
            </div>
            <h2 className="mt-4 text-2xl font-semibold">What this page will grow into</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              Invite teammates, review accepted and pending members, promote roles, and connect each person to task ownership.
            </p>
          </div>
          <div className="max-w-sm rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm font-medium">
              <MailPlus className="h-5 w-5" />
              Good next backend milestone
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Replace manual role and status assignment with invite and accept flows driven by the existing organization membership model.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
