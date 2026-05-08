import { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { Zap, LogOut, LucideIcon } from 'lucide-react';

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface DashboardLayoutProps {
  title: string;
  menuItems: MenuItem[];
  children: ReactNode;
}

export function DashboardLayout({ title, menuItems, children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl">Trexa</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Signed in as</p>
                <p>{user?.name}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full py-8">
          <div className="flex gap-6 h-full">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-4 sticky top-8">
                <h2 className="text-lg mb-4">{title}</h2>
                <nav className="space-y-2">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                    >
                      <item.icon className="h-5 w-5 text-gray-600" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}