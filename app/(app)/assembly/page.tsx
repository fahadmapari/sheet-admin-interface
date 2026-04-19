import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { AssemblyClient } from './assembly-client';

export default async function AssemblyPage() {
  const session = await auth();
  const admin = !!session?.user?.email && (await isAdmin(session.user.email));

  return (
    <Suspense fallback={null}>
      <AssemblyClient isAdmin={admin} />
    </Suspense>
  );
}
