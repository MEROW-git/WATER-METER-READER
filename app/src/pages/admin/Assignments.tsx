import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listsApi, usersApi, assignmentsApi, recordsApi } from '@/lib/api';
import type { ReadingList, User, LocationProgress } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  UserCheck, 
  Users, 
  MapPin, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Assignments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialListId = searchParams.get('listId');

  const [lists, setLists] = useState<ReadingList[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [locations, setLocations] = useState<LocationProgress[]>([]);
  const [selectedList, setSelectedList] = useState<string>(initialListId || '');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk' | 'all'>('single');

  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetchLocations(parseInt(selectedList));
    }
  }, [selectedList]);

  const fetchInitialData = async () => {
    try {
      const [listsRes, staffRes] = await Promise.all([
        listsApi.getAll(),
        usersApi.getStaff(),
      ]);
      setLists(listsRes.data.lists.filter((l: ReadingList) => l.status === 'active'));
      setStaff(staffRes.data.staff);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch initial data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async (listId: number) => {
    try {
      const response = await recordsApi.getLocations(listId);
      setLocations(response.data.locations);
      setSelectedLocations([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch locations',
        variant: 'destructive',
      });
    }
  };

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === locations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locations.map((l) => l.locationId));
    }
  };

  const handleAssign = async () => {
    if (!selectedList || !selectedStaff) {
      toast({
        title: 'Error',
        description: 'Please select a list and staff member',
        variant: 'destructive',
      });
      return;
    }

    setIsAssigning(true);
    try {
      const listId = parseInt(selectedList);
      const staffId = parseInt(selectedStaff);

      if (assignmentMode === 'all') {
        await assignmentsApi.assignAllToStaff(listId, staffId);
        toast({
          title: 'Success',
          description: 'All locations assigned successfully',
        });
      } else if (assignmentMode === 'bulk' && selectedLocations.length > 0) {
        await assignmentsApi.assignBulkLocations(listId, selectedLocations, staffId);
        toast({
          title: 'Success',
          description: `${selectedLocations.length} locations assigned successfully`,
        });
      } else if (assignmentMode === 'single' && selectedLocations.length === 1) {
        await assignmentsApi.assignLocation(listId, selectedLocations[0], staffId);
        toast({
          title: 'Success',
          description: 'Location assigned successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Please select at least one location',
          variant: 'destructive',
        });
        return;
      }

      fetchLocations(listId);
      setSelectedLocations([]);
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign locations',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const openConfirmDialog = (mode: 'single' | 'bulk' | 'all') => {
    setAssignmentMode(mode);
    setShowConfirmDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedStaffMember = staff.find((s) => s.id === parseInt(selectedStaff));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">
          Assign locations to staff members for meter reading
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Assignment Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Assign Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Reading List</Label>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={String(list.id)}>
                      {list.listName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedList && selectedStaff && (
              <div className="space-y-2 pt-4 border-t">
                <Button
                  className="w-full"
                  onClick={() => openConfirmDialog('all')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Assign All Locations
                </Button>
                
                {selectedLocations.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openConfirmDialog(selectedLocations.length === 1 ? 'single' : 'bulk')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Assign Selected ({selectedLocations.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Locations List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Locations
              {selectedList && (
                <Badge variant="secondary" className="ml-2">
                  {locations.length} total
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedList ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Select a reading list to view locations</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No locations found in this list</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={
                      selectedLocations.length === locations.length &&
                      locations.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedLocations.length} selected)
                  </span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-auto">
                  {locations.map((location) => (
                    <div
                      key={location.locationId}
                      className={`
                        flex items-center gap-4 p-3 rounded-lg border transition-colors
                        ${location.assignedTo ? 'bg-muted/50' : 'hover:bg-muted'}
                      `}
                    >
                      <Checkbox
                        checked={selectedLocations.includes(location.locationId)}
                        onCheckedChange={() => handleLocationToggle(location.locationId)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{location.locationId}</span>
                          {location.assignedTo && (
                            <Badge variant="secondary" className="text-xs">
                              Assigned to {location.assignedTo.fullName}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {location.completed}/{location.total} completed
                            </span>
                            <span className="font-medium">
                              {location.progressPercentage}%
                            </span>
                          </div>
                          <Progress 
                            value={location.progressPercentage} 
                            className="h-1.5"
                          />
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <p className="font-medium">{location.total}</p>
                        <p className="text-xs text-muted-foreground">records</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Assignment</DialogTitle>
            <DialogDescription>
              {assignmentMode === 'all' ? (
                <>Assign all {locations.length} locations to <strong>{selectedStaffMember?.fullName}</strong>?</>
              ) : (
                <>Assign {selectedLocations.length} location(s) to <strong>{selectedStaffMember?.fullName}</strong>?</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">List:</span> {lists.find(l => String(l.id) === selectedList)?.listName}</p>
              <p><span className="text-muted-foreground">Staff:</span> {selectedStaffMember?.fullName}</p>
              <p><span className="text-muted-foreground">Locations:</span> {assignmentMode === 'all' ? locations.length : selectedLocations.length}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assignments;
