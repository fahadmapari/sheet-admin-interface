import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageSubscriptionSettings } from '@/components/notifications/stage-subscription-settings';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="notifications" className="mt-4">
          <StageSubscriptionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
