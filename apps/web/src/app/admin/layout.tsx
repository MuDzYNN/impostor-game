import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = { title: "Panel admina" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
	return <AdminShell>{children}</AdminShell>;
}
