'use client';

import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/fetcher';
import type { FiltersResponse } from '@/lib/types';
import { ImportedSourcesList } from './imported-sources-list';
import { CrawlHistoryList } from './crawl-history-list';
import { NewCrawlDialog } from './new-crawl-dialog';

export function SourcesIndexClient({ isAdmin }: { isAdmin: boolean }) {
  const { data: filters } = useSWR<FiltersResponse>('/api/filters', fetcher);
  const countries = filters?.countries ?? [];
  const cities = filters?.cities ?? [];

  return (
    <Tabs defaultValue="imported" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="imported">Imported Sources</TabsTrigger>
          <TabsTrigger value="history">Crawl History</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <NewCrawlDialog
            countries={countries}
            cities={cities}
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
                New Crawl
              </Button>
            }
          />
        )}
      </div>
      <TabsContent value="imported">
        <ImportedSourcesList isAdmin={isAdmin} />
      </TabsContent>
      <TabsContent value="history">
        <CrawlHistoryList />
      </TabsContent>
    </Tabs>
  );
}
