import { Sidebar } from "./Sidebar";
import { Topbar }  from "./Topbar";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
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
