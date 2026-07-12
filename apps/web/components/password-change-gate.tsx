import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../lib/server-auth";

export default async function PasswordChangeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/login");
  if (session.forcePasswordChange) {
    redirect("/settings?forcePasswordChange=1");
  }
  return children;
}
