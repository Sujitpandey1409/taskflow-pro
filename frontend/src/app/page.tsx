// src/app/page.tsx
import { redirect } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  // This runs only on server — super fast & secure
  const user = useAuthStore.getState().user;

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}