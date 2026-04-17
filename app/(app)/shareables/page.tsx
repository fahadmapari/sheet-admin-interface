import { ShareablesClient } from './shareables-client';

export default function ShareablesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Shareables</h1>
      <ShareablesClient />
    </div>
  );
}
