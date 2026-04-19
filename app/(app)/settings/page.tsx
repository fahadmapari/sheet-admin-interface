import { auth } from '@/lib/auth';
import { getAccessControl } from '@/lib/access-control';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageSubscriptionSettings } from '@/components/notifications/stage-subscription-settings';
import { AccessControlSettings } from '@/components/settings/access-control-settings';
import { ColumnGroupSettings } from '@/components/settings/column-group-settings';
import { ColumnMappingSettings } from '@/components/settings/column-mapping-settings';
import { DataSettings } from '@/components/settings/data-settings';

export default async function SettingsPage() {
  const session = await auth();
  const accessControl = await getAccessControl();
  const showAccessTab =
    !!session?.user?.email && accessControl.adminEmails.includes(session.user.email.toLowerCase());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue="notifications">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            {showAccessTab && <TabsTrigger value="access">Access</TabsTrigger>}
            {showAccessTab && <TabsTrigger value="column-groups">Column Groups</TabsTrigger>}
            {showAccessTab && <TabsTrigger value="column-mapping">Column Mapping</TabsTrigger>}
            {showAccessTab && <TabsTrigger value="data">Data</TabsTrigger>}
          </TabsList>
        </div>
        <TabsContent value="notifications" className="mt-4">
          <StageSubscriptionSettings />
        </TabsContent>
        {showAccessTab && (
          <TabsContent value="access" className="mt-4">
            <AccessControlSettings
              initialData={accessControl}
              currentUserEmail={session!.user!.email!}
            />
          </TabsContent>
        )}
        {showAccessTab && (
          <TabsContent value="column-groups" className="mt-4">
            <ColumnGroupSettings />
          </TabsContent>
        )}
        {showAccessTab && (
          <TabsContent value="column-mapping" className="mt-4">
            <ColumnMappingSettings />
          </TabsContent>
        )}
        {showAccessTab && (
          <TabsContent value="data" className="mt-4">
            <DataSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
