import { cookies } from 'next/headers'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = cookies().get('admin_token')?.value === process.env.ADMIN_TOKEN

  if (!isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--paper)' }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
