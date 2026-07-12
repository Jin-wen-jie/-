import { AdminShell } from "../../components/admin-shell";
import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../lib/server-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/login");
  return (
    <AdminShell forcePasswordChange={session.forcePasswordChange}>
      {children}
    </AdminShell>
  );
}
