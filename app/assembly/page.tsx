import { Suspense } from 'react';
import { AssemblyClient } from './assembly-client';

export default function AssemblyPage() {
  return (
    <Suspense fallback={null}>
      <AssemblyClient />
    </Suspense>
  );
}
