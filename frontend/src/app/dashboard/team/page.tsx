"use client";

import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { Member } from "@/types/member";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";

const roleGuide = [
  {
    title: "Owner",
    description: "Full control of the workspace, billing, invites, and organization-level decisions.",
  },
  {
    title: "Admin",
    description: "Can help manage projects, tasks, members, and operational workflows.",
  },
  {
    title: "Member",
    description: "Works inside projects and tasks after being invited into the organization.",
  },
];

export default function TeamPage() {
  const currentOrg = useAuthStore((state) => state.currentOrg);
  const orgId = currentOrg?.id;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.members(orgId),
    queryFn: () => api.get<{ members: Member[] }>("/members").then((res) => res.data.members || []),
    enabled: Boolean(orgId),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post("/members/invite", { email, role }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(orgId) });
      toast.success(response.data.message || "Invite created");
      setEmail("");
      setRole("MEMBER");
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to create invite");
        return;
      }

      toast.error("Failed to create invite");
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Team</h1>
          <p className="mt-2 text-lg text-gray-600">
            Invite teammates by email, track pending invitations, and see who already belongs to this organization.
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Invite flow active</Badge>
      </div>

      <Card className="border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <MailPlus className="h-5 w-5 text-indigo-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Invite teammate</h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.6fr_0.8fr_auto] md:items-end">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(value: "ADMIN" | "MEMBER") => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!email.trim() || inviteMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {roleGuide.map((roleItem) => (
          <Card key={roleItem.title} className="border-gray-200 p-6 shadow-sm">
            <ShieldCheck className="mb-4 h-8 w-8 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">{roleItem.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{roleItem.description}</p>
          </Card>
        ))}
      </div>

      <Card className="border-gray-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-5 w-5 text-indigo-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Organization members</h2>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="text-gray-500">No members or invites found yet.</p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={`${member.email}-${member.role}`}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{member.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{member.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  <Badge variant={member.status === "ACCEPTED" ? "outline" : "destructive"}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
