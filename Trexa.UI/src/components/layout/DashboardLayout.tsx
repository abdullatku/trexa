import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { TrexaLogo } from '../ui/logo';
import { LogOut, LucideIcon, Menu, X } from 'lucide-react';

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path: string;
  exact?: boolean;
  onClick: () => void;
}

interface DashboardLayoutProps {
  title: string;
  menuItems: MenuItem[];
  children: ReactNode;
}

export function DashboardLayout({ title, menuItems, children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  const handleMenuItemClick = (onClick: () => void) => {
    setMobileMenuOpen(false);
    onClick();
  };

  const isActiveItem = (item: MenuItem) => {
    const itemPath = item.path.replace(/\/$/, '');
    const currentPath = location.pathname.replace(/\/$/, '');

    if (currentPath === itemPath) {
      return true;
    }

    return !item.exact && itemPath !== '' && currentPath.startsWith(`${itemPath}/`);
  };

  return (
    <div className="dashboard-shell flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="dashboard-header-row flex justify-between items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <TrexaLogo className="h-10 text-indigo-600" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="dashboard-user dashboard-user-desktop flex items-center gap-4 min-w-0">
              <div className="text-right min-w-0">
                <p className="text-sm text-gray-600">Signed in as</p>
                <p className="truncate">{user?.name}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          <button
            type="button"
            className={`mobile-menu-backdrop ${mobileMenuOpen ? 'is-open' : ''}`}
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={`dashboard-mobile-menu mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}>
            <div className="mobile-drawer-header">
              <div>
                <p className="sidebar-kicker">Workspace</p>
                <p className="sidebar-heading">{title}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="dashboard-mobile-user">
              <div className="min-w-0">
                <p className="text-sm text-gray-600">Signed in as</p>
                <p className="truncate">{user?.name}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
            <nav className="dashboard-mobile-nav">
              {menuItems.map((item, index) => {
                const isActive = isActiveItem(item);

                return (
                  <button
                    key={index}
                    onClick={() => handleMenuItemClick(item.onClick)}
                    className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-nav-icon">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <div className="dashboard-body flex-1 overflow-hidden">
        <div className="dashboard-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full py-8">
          <div className="dashboard-content flex gap-6 h-full">
            {/* Sidebar */}
            <aside className="dashboard-sidebar w-64 flex-shrink-0">
              <div className="dashboard-sidebar-card bg-white rounded-lg shadow-sm p-4">
                <div className="dashboard-sidebar-head">
                  <p className="sidebar-kicker">Workspace</p>
                  <h2 className="sidebar-heading">{title}</h2>
                </div>
                <nav className="dashboard-nav space-y-2">
                  {menuItems.map((item, index) => {
                    const isActive = isActiveItem(item);

                    return (
                      <button
                        key={index}
                        onClick={item.onClick}
                        className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="sidebar-nav-icon">
                          <item.icon className="h-5 w-5" />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main flex-1 overflow-y-auto min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
