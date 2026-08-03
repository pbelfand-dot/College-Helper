import Link from 'next/link';
import {
  Award,
  CalendarDays,
  FileText,
  GraduationCap,
  ListChecks,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { AffiliationNotice } from '@/components/layout/affiliation-notice';

const features = [
  {
    icon: GraduationCap,
    title: 'A college list you actually maintain',
    body: 'Save the colleges you are considering with your own fit notes, majors, cost questions and links — plus where you found each fact and when you last checked it.',
  },
  {
    icon: ListChecks,
    title: 'Requirements as a plain checklist',
    body: 'Every application has a checklist you control. Progress is simply completed required items divided by total required items. No hidden score, no prediction.',
  },
  {
    icon: FileText,
    title: 'An essay workspace with version history',
    body: 'Brainstorm, outline and draft in one place. Drafts autosave, every version is kept, and restoring an old one never deletes the newer ones.',
  },
  {
    icon: Sparkles,
    title: 'Activities without the guesswork',
    body: 'Track roles, hours and reflections with a character counter you configure — because the real limits change, and we will not pretend to know this year’s.',
  },
  {
    icon: Users,
    title: 'Recommendation requests, tracked kindly',
    body: 'Who you asked, when, what is due and whether you have said thank you. Letters themselves stay between your recommender and the college.',
  },
  {
    icon: Award,
    title: 'Scholarships and aid tasks',
    body: 'Amounts, deadlines, requirements and source links, with a last-verified date so you know when to check again.',
  },
  {
    icon: CalendarDays,
    title: 'One calendar for everything',
    body: 'Applications, essays, recommendations, scholarships and your own tasks — every deadline with its year and time zone, always.',
  },
  {
    icon: MessageSquareText,
    title: 'Coaching that keeps your voice',
    body: 'Ask for feedback, questions and structure. The coach will not write your essay for you, and it will never invent an achievement you did not describe.',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col">
      <header className="border-line bg-surface border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Try the demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="text-accent-text text-sm font-medium">
            Independent college application planner
          </p>
          <h1 className="text-ink mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Applying to college is a lot of small tasks. ApplyPilot keeps them in one calm place.
          </h1>
          <p className="text-ink-muted mt-5 max-w-2xl text-base sm:text-lg">
            Build your college list, track what each application actually needs, draft your essays
            with version history, and see every deadline on one calendar. No countdown timers, no
            prestige rankings, no guesses about whether you will get in.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Open the demo workspace</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="text-ink-subtle mt-3 text-xs">
            The demo needs no account and no credentials. It is seeded with a fictional student so
            every screen is useful straight away.
          </p>
        </section>

        <section id="how-it-works" className="border-line bg-surface border-y">
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="text-ink text-xl font-semibold sm:text-2xl">What you can do</h2>
            <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-3.5">
                  <span className="bg-accent-soft text-accent-text mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)]">
                    <feature.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-ink text-sm font-semibold">{feature.title}</h3>
                    <p className="text-ink-muted mt-1 text-sm">{feature.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-ink text-xl font-semibold sm:text-2xl">How we handle your writing</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <PrivacyPoint
              icon={Lock}
              title="Your essays stay yours"
              body="Nothing is sent to an AI model unless you ask for it on that specific request, and you can see exactly what will be sent before you send it."
            />
            <PrivacyPoint
              icon={ShieldCheck}
              title="We collect the minimum"
              body="No Social Security numbers, no bank details, no test-score verification, no demographic profiling. Your records are visible only to you."
            />
            <PrivacyPoint
              icon={FileText}
              title="You can take it all with you"
              body="Export a full JSON backup, your essays as Markdown, your activities as CSV, and a readable checklist — or delete everything, at any time."
            />
          </div>
        </section>

        <section className="border-line bg-surface border-t">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="text-ink text-xl font-semibold">What ApplyPilot will not do</h2>
            <ul className="text-ink-muted mt-5 flex flex-col gap-3 text-sm">
              <li>
                <strong className="text-ink font-medium">
                  It will not submit anything for you.
                </strong>{' '}
                ApplyPilot is a planning tool. You submit your applications yourself, on the
                official sites, with your own account.
              </li>
              <li>
                <strong className="text-ink font-medium">It will not predict your chances.</strong>{' '}
                There is no acceptance calculator here, because no honest one exists.
              </li>
              <li>
                <strong className="text-ink font-medium">
                  It will not write your essay as you.
                </strong>{' '}
                The coach asks questions, points at what is unclear, and explains why a change might
                help. The sentences stay yours.
              </li>
              <li>
                <strong className="text-ink font-medium">
                  It will not rank you, or rank colleges by prestige.
                </strong>{' '}
                Your list is your list.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-line bg-surface border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8">
          <Logo href="/" />
          <AffiliationNotice />
          <p className="text-ink-subtle text-xs">
            ApplyPilot does not provide legal, financial or professional admissions advice.
            Deadlines, requirements, costs and policies change — always confirm them on the
            college&rsquo;s official website.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PrivacyPoint({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="bg-surface-muted text-ink-muted flex size-8 items-center justify-center rounded-[var(--radius)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <h3 className="text-ink mt-3 text-sm font-semibold">{title}</h3>
      <p className="text-ink-muted mt-1 text-sm">{body}</p>
    </div>
  );
}
