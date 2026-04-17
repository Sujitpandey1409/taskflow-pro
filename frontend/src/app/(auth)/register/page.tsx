"use client";

import { useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { registerSchema, RegisterFormData } from "@/validations/auth";

export default function RegisterPage() {
  const {
    register: registerUser,
    isLoading,
    isAuthenticated,
    user,
  } = useAuthStore();
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      registrationMode: "CREATE_ORG",
      orgName: "",
    },
  });

  const registrationMode = useWatch({
    control,
    name: "registrationMode",
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router, user]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      if (!data.orgName?.trim()) {
        delete data.orgName;
      }
      await registerUser(data);
      toast.success(
        data.registrationMode === "JOIN_INVITE"
          ? "Account created and organization joined"
          : "Registration successful",
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Registration failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <Card className="w-full max-w-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Your Account
          </h1>
          <p className="text-gray-600 mt-2">
            Create a new workspace or join an existing organization through an
            invite.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setValue("registrationMode", "CREATE_ORG", {
                  shouldValidate: true,
                })
              }
              className={`rounded-2xl border p-4 text-left transition-all ${
                registrationMode === "CREATE_ORG"
                  ? "border-purple-500 bg-purple-50 shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
            >
              <p className="font-semibold text-gray-900">Create workspace</p>
              <p className="mt-2 text-sm text-gray-600">
                Best for owners or founders setting up a company for the first
                time.
              </p>
            </button>
            <button
              type="button"
              onClick={() =>
                setValue("registrationMode", "JOIN_INVITE", {
                  shouldValidate: true,
                })
              }
              className={`rounded-2xl border p-4 text-left transition-all ${
                registrationMode === "JOIN_INVITE"
                  ? "border-purple-500 bg-purple-50 shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
            >
              <p className="font-semibold text-gray-900">
                Join invited workspace
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Use this when a teammate invited your email from the Members
                page.
              </p>
            </button>
          </div>

          <input type="hidden" {...register("registrationMode")} />

          <div>
            <Label>Name</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" {...register("email")} />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label>Password</Label>
            <Input type="password" {...register("password")} />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {registrationMode === "CREATE_ORG" ? (
            <div>
              <Label>Organization Name</Label>
              <Input {...register("orgName")} placeholder="Acme Labs" />
              {errors.orgName && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.orgName.message}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
              Register with the same email that was invited. Your account will
              be attached to that organization automatically.
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : registrationMode === "JOIN_INVITE" ? (
              "Join Organization"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-purple-600 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
