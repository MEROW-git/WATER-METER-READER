import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { recordsApi } from '@/lib/api';
import type { MeterRecord } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList, 
  MapPin, 
  User, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Save,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EnterReading: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRecordId = searchParams.get('recordId');
  const newReadInputRef = useRef<HTMLInputElement>(null);

  const [pendingRecords, setPendingRecords] = useState<MeterRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MeterRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newRead, setNewRead] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState({ total: 0, completed: 0 });

  const { toast } = useToast();

  const filteredPendingRecords = pendingRecords.filter((record) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      record.meterId.toLowerCase().includes(query) ||
      record.customer.toLowerCase().includes(query) ||
      record.locationId.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  useEffect(() => {
    if (initialRecordId && pendingRecords.length > 0) {
      const record = pendingRecords.find(r => String(r.id) === initialRecordId);
      if (record) {
        selectRecord(record);
      }
    }
  }, [initialRecordId, pendingRecords]);

  const fetchPendingRecords = async () => {
    try {
      const response = await recordsApi.getPending({ limit: 100 });
      const fetchedRecords = response.data.records;
      setPendingRecords(fetchedRecords);
      
      // Calculate stats
      const total = response.data.pagination.total;
      const completedResponse = await recordsApi.getCompleted({ limit: 1 });
      setStats({
        total: total + (completedResponse.data.pagination?.total || 0),
        completed: completedResponse.data.pagination?.total || 0,
      });

      const requestedRecord = initialRecordId
        ? fetchedRecords.find((record: MeterRecord) => String(record.id) === initialRecordId)
        : null;

      if (requestedRecord) {
        selectRecord(requestedRecord);
      } else if (fetchedRecords.length > 0 && !selectedRecord) {
        // Auto-select first record if none selected
        selectRecord(fetchedRecords[0]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch pending records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectRecord = (record: MeterRecord) => {
    setSelectedRecord(record);
    setNewRead(record.newRead ? String(record.newRead) : '');
    setNotes(record.text34 || '');
    setError('');
    setSuccessMessage('');
    
    // Focus on new read input after a short delay
    setTimeout(() => {
      newReadInputRef.current?.focus();
      newReadInputRef.current?.select();
    }, 100);
  };

  const validateReading = (): boolean => {
    if (!newRead || newRead.trim() === '') {
      setError('Please enter a reading value');
      return false;
    }

    const newReadValue = parseFloat(newRead);
    if (isNaN(newReadValue) || newReadValue < 0) {
      setError('Please enter a valid non-negative number');
      return false;
    }

    if (selectedRecord?.oldRead && newReadValue < parseFloat(String(selectedRecord.oldRead))) {
      setError(`New reading cannot be lower than old reading (${selectedRecord.oldRead})`);
      return false;
    }

    return true;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!selectedRecord || !validateReading()) return;

    setIsSaving(true);
    setError('');

    try {
      await recordsApi.updateNewRead(selectedRecord.id, newRead, notes);
      
      setSuccessMessage('Reading saved successfully!');
      setStats(s => ({ ...s, completed: s.completed + 1 }));
      
      // Remove saved record from pending list
      setPendingRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      
      toast({
        title: 'Success',
        description: 'Reading saved successfully',
      });

      // Move to next record after a short delay
      setTimeout(() => {
        const currentIndex = pendingRecords.findIndex(r => r.id === selectedRecord.id);
        const nextRecord = pendingRecords[currentIndex + 1];
        
        if (nextRecord) {
          selectRecord(nextRecord);
        } else if (pendingRecords.length > 1) {
          // If we were at the last record, go to first
          selectRecord(pendingRecords[0]);
        } else {
          // No more records
          setSelectedRecord(null);
        }
        
        setSuccessMessage('');
      }, 1000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save reading');
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save reading',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enter Reading</h1>
          <p className="text-muted-foreground">
            Quick entry form for meter readings
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Today's Progress</p>
          <p className="text-2xl font-bold">
            {stats.completed} <span className="text-muted-foreground text-lg">/ {stats.total}</span>
          </p>
        </div>
      </div>

      <Progress value={(stats.completed / stats.total) * 100} className="h-2" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Record Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pending Records ({filteredPendingRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meter ID, customer, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {filteredPendingRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {pendingRecords.length === 0 ? (
                    <CheckCircle2 className="mx-auto h-12 w-12 mb-4 text-green-500" />
                  ) : (
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-500" />
                  )}
                  <p>{pendingRecords.length === 0 ? 'All caught up!' : 'No matching records'}</p>
                  <p className="text-sm">
                    {pendingRecords.length === 0
                      ? 'No pending records'
                      : 'Try a different search'}
                  </p>
                </div>
              ) : (
                filteredPendingRecords.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => selectRecord(record)}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-colors
                      ${selectedRecord?.id === record.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{record.meterId}</p>
                        <p className="text-sm text-muted-foreground">{record.customer}</p>
                      </div>
                      <Badge variant="outline">{record.locationId}</Badge>
                    </div>
                    {record.oldRead && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Old: {record.oldRead}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entry Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reading Entry</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRecord ? (
              <form onSubmit={handleSave} className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Meter ID</p>
                    <p className="font-medium text-lg">{selectedRecord.meterId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedRecord.customer}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedRecord.locationId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">List</p>
                    <p className="font-medium">{selectedRecord.readingList?.listName}</p>
                  </div>
                </div>

                {/* Old Reading */}
                {selectedRecord.oldRead && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Previous Reading</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedRecord.oldRead}
                      </p>
                    </div>
                  </div>
                )}

                {/* New Reading Input */}
                <div className="space-y-2">
                  <Label htmlFor="new-read" className="text-lg">
                    New Reading *
                  </Label>
                  <Input
                    ref={newReadInputRef}
                    id="new-read"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter new reading..."
                    value={newRead}
                    onChange={(e) => {
                      setNewRead(e.target.value);
                      setError('');
                    }}
                    onKeyDown={handleKeyDown}
                    className="h-14 text-2xl text-center"
                    disabled={isSaving}
                    autoFocus
                  />
                  <p className="text-sm text-muted-foreground">
                    Press Enter to save and go to next record
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add any notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {successMessage && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 h-12"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-5 w-5" />
                    )}
                    Save Reading
                  </Button>
                  
                  {pendingRecords.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const currentIndex = pendingRecords.findIndex(r => r.id === selectedRecord.id);
                        const nextRecord = pendingRecords[currentIndex + 1] || pendingRecords[0];
                        selectRecord(nextRecord);
                      }}
                      disabled={isSaving}
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No record selected</p>
                <p>Select a record from the list to start entering readings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnterReading;
