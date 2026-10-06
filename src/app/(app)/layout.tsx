import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu, AppNav } from "@/components/app-nav";
import { Logo } from "@/components/ui";
import { requireUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:h-screen md:w-60 md:shrink-0 md:gap-6 md:border-b-0 md:border-r md:px-3 md:py-5">
        <div className="flex items-center justify-between md:block md:px-2.5">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <div className="md:hidden">
            <AccountMenu email={user.email} />
          </div>
        </div>
        <Suspense>
          <AppNav />
        </Suspense>
        <div className="mt-auto hidden md:block">
          <AccountMenu email={user.email} />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 md:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
