import { redirect } from 'next/navigation';

export default async function LegacyLearnerMessagesPage() {
  redirect('/dashboard/support');
}


