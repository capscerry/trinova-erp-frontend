"use client";

import { useAuth } from "@/lib/AuthContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ModuleLayout } from "./ModuleLayout";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-sm font-medium text-slate-400">Memuat...</div>
      </div>
    );
  }

  if (user && user.role !== "admin") {
    return (
      <ModuleLayout title={title} subtitle={subtitle}>
        {children}
      </ModuleLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Sidebar />
      <div className="ml-66 flex min-h-screen flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
