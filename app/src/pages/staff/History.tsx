import React, { useEffect, useState } from 'react';
import { recordsApi } from '@/lib/api';
import type { MeterRecord } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  History as HistoryIcon, 
  Calendar,
  TrendingUp,
  Loader2,
  CheckCircle2,
  PencilLine
} from 'lucide-react';
import { format } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const History: React.FC = () => {
  const [records, setRecords] = useState<MeterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<MeterRecord | null>(null);
  const [editNewRead, setEditNewRead] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompletedRecords();
  }, [pagination.page]);

  const fetchCompletedRecords = async () => {
    try {
      const response = await recordsApi.getCompleted({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRecords(response.data.records);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch completed records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter(
    (record) =>
      record.meterId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditDialog = (record: MeterRecord) => {
    setEditingRecord(record);
    setEditNewRead(record.newRead ? String(record.newRead) : '');
    setEditNotes(record.text34 || '');
  };

  const closeEditDialog = () => {
    if (isSaving) return;
    setEditingRecord(null);
    setEditNewRead('');
    setEditNotes('');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const newReadValue = parseFloat(editNewRead);
    const oldReadValue = editingRecord.oldRead !== undefined && editingRecord.oldRead !== null
      ? parseFloat(String(editingRecord.oldRead))
      : null;

    if (Number.isNaN(newReadValue) || newReadValue < 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid non-negative reading',
        variant: 'destructive',
      });
      return;
    }

    if (oldReadValue !== null && newReadValue < oldReadValue) {
      toast({
        title: 'Error',
        description: `New reading cannot be lower than old reading (${oldReadValue})`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await recordsApi.updateNewRead(editingRecord.id, newReadValue, editNotes);
      const updatedRecord = response.data.record;

      setRecords((prev) =>
        prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
      );

      toast({
        title: 'Success',
        description: 'Reading updated successfully',
      });
      closeEditDialog();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update reading',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Completed History</h1>
        <p className="text-muted-foreground">
          View all readings you have completed
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pagination.total}</p>
                <p className="text-sm text-muted-foreground">Total Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {records.filter(r => {
                    const completedDate = r.completedAt ? new Date(r.completedAt) : null;
                    const today = new Date();
                    return completedDate && 
                      completedDate.getDate() === today.getDate() &&
                      completedDate.getMonth() === today.getMonth() &&
                      completedDate.getFullYear() === today.getFullYear();
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {records.length > 0 
                    ? (records.reduce((sum, r) => sum + (parseFloat(String(r.newRead)) || 0), 0) / records.length).toFixed(1)
                    : '0'
                  }
                </p>
                <p className="text-sm text-muted-foreground">Avg Reading</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by meter ID or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meter ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Old Read</TableHead>
                <TableHead>New Read</TableHead>
                <TableHead>Completed At</TableHead>
                <TableHead className="w-[120px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.meterId}</TableCell>
                  <TableCell>{record.customer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.locationId}</Badge>
                  </TableCell>
                  <TableCell>{record.oldRead || '-'}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {record.newRead}
                  </TableCell>
                  <TableCell>
                    {record.completedAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(record.completedAt), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(record)}
                    >
                      <PencilLine className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <HistoryIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No completed records</h3>
          <p className="text-muted-foreground">
            You haven't completed any readings yet
          </p>
        </div>
      )}

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reading</DialogTitle>
            <DialogDescription>
              Update the completed reading for {editingRecord?.meterId}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm">
              <p><span className="text-muted-foreground">Customer:</span> {editingRecord?.customer}</p>
              <p><span className="text-muted-foreground">Location:</span> {editingRecord?.locationId}</p>
              <p><span className="text-muted-foreground">Old Read:</span> {editingRecord?.oldRead || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-new-read">New Reading</Label>
              <Input
                id="edit-new-read"
                type="number"
                step="0.01"
                min="0"
                value={editNewRead}
                onChange={(e) => setEditNewRead(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={isSaving}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;
