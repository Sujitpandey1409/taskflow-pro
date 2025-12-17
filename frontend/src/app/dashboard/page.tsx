// src/app/dashboard/page.tsx
"use client";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const { user, currentOrg } = useAuthStore();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">
          Welcome back, {user?.name.split(" ")[0]}!
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          You're in <span className="font-semibold">{currentOrg?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-indigo-600">0</h3>
          <p className="text-gray-600 mt-2">Active Projects</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-emerald-600">0</h3>
          <p className="text-gray-600 mt-2">Tasks In Progress</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-amber-600">0</h3>
          <p className="text-gray-600 mt-2">Due This Week</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-10 text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-lg opacity-90 mb-8">
          Create your first project and invite your team.
        </p>
        <Link href="/dashboard/projects">
          <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
            <Plus className="mr-2 h-5 w-5" />
            Create First Project
          </Button>
        </Link>
      </div>
    </div>
  );
}