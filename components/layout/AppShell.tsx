"use client";

import { useAuth } from "@/lib/AuthContext";
import { Sidebar } from "./Sidebar";
import { Topbar }  from "./Topbar";
import { ModuleLayout } from "./ModuleLayout";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const { user,isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm font-serif">Memuat...</div>
      </div>
    );
  }
  // Role non-admin: pakai ModuleLayout (tanpa sidebar, gunakan tab menu)
  if (user && user.role !== "admin") {
    return (
      <ModuleLayout title={title} subtitle={subtitle}>
        {children}
      </ModuleLayout>
    );
  }

  // Admin: layout normal dengan sidebar
  return (
    <div className="min-h-screen bg-slate-100 font-serif">
      <Sidebar />
      <div className="ml-[248px] flex flex-col min-h-screen">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-7">{children}</main>
      </div>
    </div>
  );
}
