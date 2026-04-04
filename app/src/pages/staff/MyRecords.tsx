import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { recordsApi, listsApi } from '@/lib/api';
import type { MeterRecord, ReadingList } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  ClipboardList, 
  MapPin, 
  User,
  Loader2,
  ChevronRight,
  PencilLine,
  CheckCircle2
} from 'lucide-react';

const ALL_LISTS = 'all-lists';
const ALL_STATUSES = 'all-statuses';

const MyRecords: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedList, setSelectedList] = useState<string>(
    searchParams.get('listId') || ALL_LISTS
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_STATUSES);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedLists();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [selectedList, selectedStatus]);

  const fetchAssignedLists = async () => {
    try {
      const response = await listsApi.getAll();
      setLists(response.data.lists.filter((l: ReadingList) => l.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      const params: any = {
        page: 1,
        limit: 1000,
      };
      
      if (selectedList !== ALL_LISTS) params.listId = selectedList;
      if (selectedStatus !== ALL_STATUSES) params.status = selectedStatus;
      if (searchQuery) params.meterId = searchQuery;

      const response = await recordsApi.getAll(params);
      setRecords(response.data.records);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchRecords();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
    };
    const labels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Records</h1>
        <p className="text-muted-foreground">
          View all meter records assigned to you
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by meter ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedList} onValueChange={setSelectedList}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Lists" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LISTS}>All Lists</SelectItem>
            {lists.map((list) => (
              <SelectItem key={list.id} value={String(list.id)}>
                {list.listName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meter ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Old Read</TableHead>
                <TableHead>New Read</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.meterId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {record.customer}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {record.locationId}
                      </div>
                    </TableCell>
                    <TableCell>{record.oldRead || '-'}</TableCell>
                  <TableCell>{record.newRead || '-'}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell className="text-right">
                    {record.status === 'completed' ? (
                      <Button variant="outline" size="sm" disabled className="min-w-[108px]">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Done
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-w-[108px]"
                        onClick={() => navigate(`/enter-reading?recordId=${record.id}`)}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Open
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {records.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No records found</h3>
          <p className="text-muted-foreground">
            You don't have any assigned records yet
          </p>
        </div>
      )}
    </div>
  );
};

export default MyRecords;
