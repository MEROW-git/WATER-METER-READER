// User types
export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Reading List types
export type ListStatus = 'draft' | 'active' | 'completed' | 'hidden' | 'archived';

export interface ReadingList {
  id: number;
  listName: string;
  sheetDate?: string;
  uploadedFileName: string;
  status: ListStatus;
  uploadedBy: number;
  hiddenFromStaff: boolean;
  createdAt: string;
  updatedAt: string;
  uploader?: User;
  _count?: { records: number };
  stats?: ListStats;
  locationIds?: string[];
}

export interface ListStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  progressPercentage: number;
}

// Meter Record types
export type RecordStatus = 'pending' | 'in_progress' | 'completed';

export interface MeterRecord {
  id: number;
  readingListId: number;
  nameId?: string;
  meterId: string;
  customer: string;
  locationId: string;
  st?: string;
  village?: string;
  readingDate?: string;
  oldRead?: string | number;
  newRead?: string | number;
  text34?: string;
  assignedToUserId?: number;
  completedByUserId?: number;
  completedAt?: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
  readingList?: ReadingList;
  assignedTo?: User;
  completedBy?: User;
}

// Assignment types
export interface Assignment {
  id: number;
  readingListId: number;
  locationId: string;
  assignedToUserId: number;
  assignedByUserId: number;
  assignedAt: string;
  readingList?: ReadingList;
  assignedTo?: User;
  assignedBy?: User;
}

// Activity Log types
export interface ActivityLog {
  id: number;
  userId: number;
  actionType: string;
  description: string;
  relatedListId?: number;
  relatedRecordId?: number;
  createdAt: string;
  user?: User;
}

// Dashboard types
export interface DashboardStats {
  staff: {
    total: number;
    active: number;
  };
  lists: {
    total: number;
    active: number;
    completed: number;
    hidden: number;
    archived: number;
  };
  records: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overallProgress: number;
  };
}

// Location progress
export interface LocationProgress {
  locationId: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  progressPercentage: number;
  assignedTo?: User | null;
}

// Staff progress
export interface StaffProgress {
  id: number;
  username: string;
  fullName: string;
  stats: {
    totalAssigned: number;
    pending: number;
    inProgress: number;
    completed: number;
    progressPercentage: number;
  };
  completedByStaff: number;
  listCount: number;
  locationCount: number;
  recentCompletions: MeterRecord[];
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  [key: string]: T | string | undefined;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface UserFormData {
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'staff';
}

export interface ReadingFormData {
  newRead: string | number;
  notes?: string;
}
