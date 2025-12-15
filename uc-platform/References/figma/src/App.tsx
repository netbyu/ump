import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { Dashboard } from './components/pages/Dashboard';
import { IVRBuilder } from './components/pages/IVRBuilder';
import { FlowBuilder } from './components/pages/FlowBuilder';
import { SelfService } from './components/pages/SelfService';
import { IntegrationHub } from './components/pages/IntegrationHub';
import { OctopusRequests } from './components/pages/OctopusRequests';
import { AIAgentPage } from './components/pages/AIAgentPage';
import { TemporalDashboard } from './components/pages/TemporalDashboard';

export type PageView = 'dashboard' | 'itsm-requests' | 'monitoring' | 'phone-systems' | 'call-report' | 'automation-dashboard' | 'automation-builder' | 'agents' | 'mcp' | 'fax-management' | 'ivr' | 'self-service' | 'integrations' | 'admin' | 'settings';
export type TicketGroup = 'incidents' | 'service-requests' | 'problems' | null;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTicketGroup, setSelectedTicketGroup] = useState<TicketGroup>(null);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleNavigateToITSM = (group?: TicketGroup) => {
    setSelectedTicketGroup(group || null);
    setCurrentPage('itsm-requests');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigateToOctopus={handleNavigateToITSM} />;
      case 'itsm-requests':
        return <OctopusRequests selectedGroup={selectedTicketGroup} />;
      case 'monitoring':
        return <div className="p-8">Monitoring - Coming Soon</div>;
      case 'phone-systems':
        return <div className="p-8">Phone Systems - Coming Soon</div>;
      case 'call-report':
        return <div className="p-8">Call Report - Coming Soon</div>;
      case 'automation-dashboard':
        return <TemporalDashboard />;
      case 'automation-builder':
        return <FlowBuilder />;
      case 'agents':
        return <AIAgentPage />;
      case 'mcp':
        return <div className="p-8">MCP - Coming Soon</div>;
      case 'fax-management':
        return <div className="p-8">Fax Management - Coming Soon</div>;
      case 'ivr':
        return <IVRBuilder />;
      case 'self-service':
        return <SelfService />;
      case 'integrations':
        return <IntegrationHub />;
      case 'admin':
        return <div className="p-8">Admin Panel - Coming Soon</div>;
      case 'settings':
        return <div className="p-8">Settings - Coming Soon</div>;
      default:
        return <Dashboard onNavigateToOctopus={handleNavigateToITSM} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            if (page !== 'itsm-requests') {
              setSelectedTicketGroup(null);
            }
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-auto bg-gray-900">
          {renderPage()}
        </main>
      </div>
      
      <StatusBar />
    </div>
  );
}