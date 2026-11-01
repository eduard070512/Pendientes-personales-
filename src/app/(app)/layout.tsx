import { MobileNav, Sidebar } from "@/components/nav";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar logout={logout} />
      <div className="min-w-0 flex-1">
        <MobileNav />
        <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-16 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
