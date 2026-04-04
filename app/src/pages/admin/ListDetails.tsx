import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listsApi } from '@/lib/api';
import type { ReadingList } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, Loader2, MapPin, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ListDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [list, setList] = useState<ReadingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchList = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await listsApi.getById(Number(id));
        setList(response.data.list);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load list details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/lists')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lists
        </Button>
        <p className="text-muted-foreground">Reading list not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{list.listName}</h1>
          <p className="text-muted-foreground">
            Uploaded meter reading list details
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lists')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{list.stats?.progressPercentage || 0}%</span>
              </div>
              <Progress value={list.stats?.progressPercentage || 0} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{list.stats?.total || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{list.stats?.pending || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{list.stats?.inProgress || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{list.stats?.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>List Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{list.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Uploaded</span>
              <span>{new Date(list.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sheet Date</span>
              <span>{list.sheetDate ? new Date(list.sheetDate).toLocaleDateString() : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hidden</span>
              <span>{list.hiddenFromStaff ? 'Yes' : 'No'}</span>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Location IDs</p>
              <div className="flex flex-wrap gap-2">
                {list.locationIds && list.locationIds.length > 0 ? (
                  list.locationIds.map((locationId) => (
                    <Badge key={locationId} variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {locationId}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No locations found</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 text-sm font-medium">Uploader</p>
              <p>{list.uploader?.fullName || '-'}</p>
              <p className="text-sm text-muted-foreground">@{list.uploader?.username || '-'}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Source File
              </p>
              <p className="text-sm text-muted-foreground break-all">{list.uploadedFileName}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ListDetails;
