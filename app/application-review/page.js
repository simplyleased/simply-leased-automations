import { redirect } from 'next/navigation';
import { getAllowedUser } from '@/lib/user';
import FunctionPage from '@/app/_components/FunctionPage';

export default async function Page() {
  const user = await getAllowedUser();
  if (!user) redirect('/');
  return <FunctionPage slug="application-review" email={user.email} />;
}
