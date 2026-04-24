import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <KeyboardShortcutsProvider>
      <InnerLayout>{children}</InnerLayout>
    </KeyboardShortcutsProvider>
  );
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="hidden md:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
