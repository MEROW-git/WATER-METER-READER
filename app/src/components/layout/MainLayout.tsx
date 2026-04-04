import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  List,
  UserCheck,
  ClipboardList,
  History,
  LogOut,
  Menu,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  staffOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Users', path: '/users', icon: Users, adminOnly: true },
  { label: 'Upload Excel', path: '/upload', icon: FileSpreadsheet, adminOnly: true },
  { label: 'Lists', path: '/lists', icon: List },
  { label: 'Assignments', path: '/assignments', icon: UserCheck, adminOnly: true },
  { label: 'My Records', path: '/my-records', icon: ClipboardList, staffOnly: true },
  { label: 'Enter Reading', path: '/enter-reading', icon: ClipboardList, staffOnly: true },
  { label: 'History', path: '/history', icon: History, staffOnly: true },
  { label: 'Reports', path: '/reports', icon: LayoutDashboard, adminOnly: true },
];

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !hasRole('admin')) return false;
    if (item.staffOnly && !hasRole('staff')) return false;
    return true;
  });

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
              ${isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
              ${mobile ? 'w-full' : ''}
            `}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card fixed h-full">
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <Droplets className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Water Meter</h1>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-4 py-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.fullName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">Water Meter</span>
        </Link>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <span className="font-medium">
                    {user?.fullName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user?.fullName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-1">
              <NavLinks mobile />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="lg:p-8 p-4 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
