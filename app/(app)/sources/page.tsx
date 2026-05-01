import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { SourcesIndexClient } from './sources-index-client';

export default async function SourcesPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const admin = email ? await isAdmin(email) : false;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Sources</h1>
      <SourcesIndexClient isAdmin={admin} />
    </div>
  );
}
