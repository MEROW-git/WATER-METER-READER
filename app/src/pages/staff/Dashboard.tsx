import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi, recordsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { MeterRecord, ReadingList } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  Loader2,
  MapPin,
  Target,
  TrendingUp,
} from 'lucide-react';
import { format } from '@/lib/utils';

interface StaffDashboardStats {
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  progressPercentage: number;
}

interface StaffDashboardResponse {
  stats: StaffDashboardStats;
  assignedLists: Pick<ReadingList, 'id' | 'listName' | 'status'>[];
  recentCompletions: Array<
    Pick<MeterRecord, 'id' | 'meterId' | 'customer' | 'newRead' | 'completedAt'> & {
      readingList?: Pick<ReadingList, 'listName'>;
    }
  >;
}

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [assignedLists, setAssignedLists] = useState<StaffDashboardResponse['assignedLists']>([]);
  const [recentCompletions, setRecentCompletions] = useState<StaffDashboardResponse['recentCompletions']>([]);
  const [nextRecords, setNextRecords] = useState<MeterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsResponse, pendingResponse] = await Promise.all([
          reportsApi.getMyStats(),
          recordsApi.getPending({ limit: 6 }),
        ]);

        const dashboard = statsResponse.data as StaffDashboardResponse;
        setStats(dashboard.stats);
        setAssignedLists(dashboard.assignedLists || []);
        setRecentCompletions(dashboard.recentCompletions || []);
        setNextRecords(pendingResponse.data.records || []);
      } catch (error) {
        console.error('Failed to load staff dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const safeStats = stats || {
    totalAssigned: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    progressPercentage: 0,
  };

  const firstPendingRecord = nextRecords[0];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-600 via-cyan-600 to-emerald-500 text-white shadow-lg">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <Badge className="w-fit border-white/20 bg-white/15 text-white hover:bg-white/15">
                Staff workspace
              </Badge>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Welcome back, {user?.fullName?.split(' ')[0] || 'Staff'}
                </h1>
                <p className="mt-2 text-sm text-white/85 md:text-base">
                  Start with your next assigned meter, review progress, and keep today&apos;s work moving.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild size="lg" variant="secondary" className="justify-between bg-white text-slate-900 hover:bg-white/90">
                <Link to={firstPendingRecord ? `/enter-reading?recordId=${firstPendingRecord.id}` : '/enter-reading'}>
                  Start next reading
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" className="justify-between border border-white/20 bg-white/10 text-white hover:bg-white/15">
                <Link to="/my-records">
                  Open my records
                  <ClipboardList className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/75">Assigned</p>
              <p className="mt-2 text-3xl font-semibold">{safeStats.totalAssigned}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/75">Pending</p>
              <p className="mt-2 text-3xl font-semibold">{safeStats.pending}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/75">Completed</p>
              <p className="mt-2 text-3xl font-semibold">{safeStats.completed}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/75">Progress</p>
              <p className="mt-2 text-3xl font-semibold">{safeStats.progressPercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200/80">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-600" />
                  Progress overview
                </CardTitle>
                <CardDescription>See how much work is left and where to focus next.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/history">View history</Link>
              </Button>
            </div>
            <Progress value={safeStats.progressPercentage} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {safeStats.completed} of {safeStats.totalAssigned} assigned records completed
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold">{safeStats.pending}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In progress</p>
                  <p className="text-2xl font-semibold">{safeStats.inProgress}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold">{safeStats.completed}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-cyan-600" />
              Quick actions
            </CardTitle>
            <CardDescription>Jump into the screens staff use most.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild className="h-auto justify-between py-4" size="lg">
              <Link to={firstPendingRecord ? `/enter-reading?recordId=${firstPendingRecord.id}` : '/enter-reading'}>
                <span>Continue next assigned reading</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-between py-4" size="lg">
              <Link to="/my-records">
                <span>Browse all assigned records</span>
                <ClipboardList className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-between py-4" size="lg">
              <Link to="/history">
                <span>Review completed history</span>
                <History className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle>Assigned lists</CardTitle>
            <CardDescription>Active work collections currently visible to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedLists.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No lists have been assigned to you yet.
              </div>
            ) : (
              assignedLists.map((list) => (
                <div key={list.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
                  <div>
                    <p className="font-medium">{list.listName}</p>
                    <p className="text-sm text-muted-foreground">List ID: {list.id}</p>
                  </div>
                  <Badge variant={list.status === 'active' ? 'default' : 'outline'}>
                    {list.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Next up</CardTitle>
                <CardDescription>Your next pending records, ready for entry.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/my-records">See all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                <p className="font-medium">You&apos;re all caught up</p>
                <p className="text-sm text-muted-foreground">No pending records are waiting right now.</p>
              </div>
            ) : (
              nextRecords.map((record) => (
                <Link
                  key={record.id}
                  to={`/enter-reading?recordId=${record.id}`}
                  className="group block rounded-2xl border bg-white p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{record.meterId}</p>
                      <p className="truncate text-sm text-muted-foreground">{record.customer}</p>
                    </div>
                    <Badge variant="outline">{record.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {record.locationId}
                    </span>
                    {record.readingList?.listName ? <span>{record.readingList.listName}</span> : null}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span>Old read: {record.oldRead || '-'}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-cyan-700">
                      Open
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80">
        <CardHeader>
          <CardTitle>Recent completions</CardTitle>
          <CardDescription>Your latest submitted meter readings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentCompletions.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Completed readings will appear here after you submit them.
            </div>
          ) : (
            recentCompletions.map((record) => (
              <div key={record.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{record.meterId}</p>
                  <p className="truncate text-sm text-muted-foreground">{record.customer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.readingList?.listName || 'Reading list'} •{' '}
                    {record.completedAt ? format(new Date(record.completedAt), 'MMM d, yyyy HH:mm') : 'Completed'}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-center">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Completed
                  </Badge>
                  <span className="text-sm font-medium text-slate-700">
                    New read: {record.newRead ?? '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboard;
