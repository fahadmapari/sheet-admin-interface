import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { AssemblyClient } from './assembly-client';

export default async function AssemblyPage() {
  const session = await getServerSession(authOptions);
  const admin = !!session?.user?.email && (await isAdmin(session.user.email));

  return (
    <Suspense fallback={null}>
      <AssemblyClient isAdmin={admin} />
    </Suspense>
  );
}
