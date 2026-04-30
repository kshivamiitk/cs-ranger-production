import { redirect } from 'next/navigation';

export default async function ContactAdminRedirectPage() {
  redirect('/dashboard/support');
}


