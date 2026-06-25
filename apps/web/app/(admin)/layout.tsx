import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboardIcon,
  UsersIcon,
  SearchIcon,
  LogOutIcon,
} from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userRow || !['admin', 'super_admin'].includes(userRow.role)) {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col border-r bg-white lg:flex">
          <div className="flex h-14 items-center border-b px-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              T
            </span>
            <span className="ml-2 font-bold text-sm">TalentVault Admin</span>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LayoutDashboardIcon className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/candidates"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <UsersIcon className="h-4 w-4" />
              Candidates
            </Link>
            <Link
              href="/admin/search"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <SearchIcon className="h-4 w-4" />
              Search
            </Link>
          </nav>

          <div className="border-t p-3">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOutIcon className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b bg-white px-4 lg:hidden">
          <span className="font-bold text-sm">TalentVault Admin</span>
          <nav className="ml-auto flex items-center gap-1">
            <Link href="/admin/dashboard" className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
              Dashboard
            </Link>
            <Link href="/admin/candidates" className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
              Candidates
            </Link>
          </nav>
        </header>

        {/* Main */}
        <main className="flex-1 lg:pl-56">
          <div className="mx-auto max-w-6xl px-4 pt-20 pb-10 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
