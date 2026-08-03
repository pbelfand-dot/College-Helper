import { env } from '@/lib/config/env';
import { requireWorkspace } from '@/lib/data/factory';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileBottomNav, MobileTopBar } from '@/components/layout/mobile-nav';
import { DemoBanner } from '@/components/layout/demo-banner';

/**
 * Shell for every signed-in page.
 *
 * Auth is checked once here rather than in each page, so no route can
 * accidentally ship without it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, repository } = await requireWorkspace();
  const profile = await repository.getProfile(session.userId);

  return (
    <div className="bg-canvas flex min-h-dvh">
      <Sidebar displayName={profile?.displayName ?? session.email ?? 'Demo student'} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        {env.demoMode ? <DemoBanner /> : null}

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
