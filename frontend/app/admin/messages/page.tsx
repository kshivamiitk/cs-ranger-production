import { redirect } from 'next/navigation';

export default async function LegacyAdminMessagesPage() {
  redirect('/admin/support');
}


