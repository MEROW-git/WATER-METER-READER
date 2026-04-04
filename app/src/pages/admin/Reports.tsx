import React, { useEffect, useState } from 'react';
import { reportsApi } from '@/lib/api';
import type { StaffProgress, ActivityLog } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  TrendingUp, 
  Activity,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';

const Reports: React.FC = () => {
  const [staffProgress, setStaffProgress] = useState<StaffProgress[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const [staffRes, logsRes] = await Promise.all([
        reportsApi.getStaffProgress(),
        reportsApi.getActivityLogs({ limit: 20 }),
      ]);
      setStaffProgress(staffRes.data.staff);
      setActivityLogs(logsRes.data.logs);
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setIsLoading(false);
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
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Staff performance and system activity
        </p>
      </div>

      {/* Staff Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {staffProgress.map((staff) => (
              <div key={staff.id} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-medium">
                        {staff.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{staff.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        @{staff.username} • {staff.listCount} lists • {staff.locationCount} locations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{staff.stats.progressPercentage}%</p>
                    <p className="text-sm text-muted-foreground">
                      {staff.stats.completed} / {staff.stats.totalAssigned}
                    </p>
                  </div>
                </div>
                
                <Progress value={staff.stats.progressPercentage} className="h-2" />
                
                <div className="flex gap-4 text-sm">
                  <span className="text-orange-600">
                    {staff.stats.pending} pending
                  </span>
                  <span className="text-blue-600">
                    {staff.stats.inProgress} in progress
                  </span>
                  <span className="text-green-600">
                    {staff.stats.completed} completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-auto">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted rounded-lg transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">
                      {log.user?.fullName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.user?.fullName}</p>
                    <p className="text-sm text-muted-foreground">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {log.actionType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...staffProgress]
                  .sort((a, b) => b.stats.completed - a.stats.completed)
                  .slice(0, 5)
                  .map((staff, index) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${index === 0 ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${index === 1 ? 'bg-gray-100 text-gray-700' : ''}
                            ${index === 2 ? 'bg-orange-100 text-orange-700' : ''}
                            ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                          `}>
                            {index + 1}
                          </span>
                          {staff.fullName}
                        </div>
                      </TableCell>
                      <TableCell>{staff.stats.completed}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={staff.stats.progressPercentage} 
                            className="w-20 h-2" 
                          />
                          <span className="text-sm">{staff.stats.progressPercentage}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
