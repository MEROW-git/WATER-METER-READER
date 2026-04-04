import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listsApi } from '@/lib/api';
import type { ReadingList } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  MoreVertical, 
  Eye, 
  EyeOff, 
  Archive, 
  RotateCcw, 
  Trash2,
  FileSpreadsheet,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Lists: React.FC = () => {
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchLists();
  }, [statusFilter]);

  const fetchLists = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await listsApi.getAll(params);
      setLists(response.data.lists);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch reading lists',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHide = async (list: ReadingList) => {
    try {
      await listsApi.hide(list.id, !list.hiddenFromStaff);
      toast({
        title: 'Success',
        description: `List ${list.hiddenFromStaff ? 'unhidden' : 'hidden'} successfully`,
      });
      fetchLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update list',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (list: ReadingList) => {
    try {
      await listsApi.archive(list.id);
      toast({
        title: 'Success',
        description: 'List archived successfully',
      });
      fetchLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to archive list',
        variant: 'destructive',
      });
    }
  };

  const handleReopen = async (list: ReadingList) => {
    try {
      await listsApi.reopen(list.id);
      toast({
        title: 'Success',
        description: 'List reopened successfully',
      });
      fetchLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reopen list',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedList) return;

    try {
      await listsApi.delete(selectedList.id);
      toast({
        title: 'Success',
        description: 'List deleted successfully',
      });
      setDeleteDialogOpen(false);
      fetchLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete list',
        variant: 'destructive',
      });
    }
  };

  const openDeleteDialog = (list: ReadingList) => {
    setSelectedList(list);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      active: 'default',
      completed: 'default',
      hidden: 'outline',
      archived: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const filteredLists = lists.filter((list) =>
    list.listName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Reading Lists</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage uploaded meter reading lists' : 'Browse available reading lists'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/upload')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Upload New
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="hidden">Hidden</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Lists Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLists.map((list) => (
          <Card key={list.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{list.listName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(list.status)}
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/lists/${list.id}`)}>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        {list.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => handleHide(list)}>
                            {list.hiddenFromStaff ? (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Unhide from Staff
                              </>
                            ) : (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Hide from Staff
                              </>
                            )}
                          </DropdownMenuItem>
                        )}

                        {list.status === 'archived' ? (
                          <DropdownMenuItem onClick={() => handleReopen(list)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reopen List
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleArchive(list)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(list)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{list.stats?.progressPercentage || 0}%</span>
                </div>
                <Progress value={list.stats?.progressPercentage || 0} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{list.stats?.completed || 0} completed</span>
                  <span>{list.stats?.total || 0} total</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-lg font-semibold text-orange-600">
                    {list.stats?.pending || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-600">
                    {list.stats?.inProgress || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">
                    {list.stats?.completed || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(isAdmin ? `/lists/${list.id}` : `/my-records?listId=${list.id}`)}
                >
                  View
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/assignments?listId=${list.id}`)}
                  >
                    Assign
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLists.length === 0 && (
        <div className="text-center py-12">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No lists found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try adjusting your search' : 'Upload your first Excel file to get started'}
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the list "{selectedList?.listName}" and all its records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Lists;
