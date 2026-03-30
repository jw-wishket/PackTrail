import AdminSidebar from '@/components/layout/AdminSidebar';

export const metadata = {
  title: 'PackTrail Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-admin-bg">
      <AdminSidebar />
      {/* Desktop: offset by sidebar width. Mobile: offset by bottom tab */}
      <main className="md:ml-[220px] pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
