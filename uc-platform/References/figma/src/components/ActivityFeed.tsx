import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const activities = [
  { 
    id: 1, 
    type: 'success', 
    title: 'Extension 1234 provisioned successfully',
    time: '2 minutes ago',
    user: 'System'
  },
  { 
    id: 2, 
    type: 'info', 
    title: 'IVR "Sales Menu" published',
    time: '15 minutes ago',
    user: 'Jane Admin'
  },
  { 
    id: 3, 
    type: 'warning', 
    title: 'MAC Request REQ-2024-0042 pending approval',
    time: '1 hour ago',
    user: 'John Manager'
  },
  { 
    id: 4, 
    type: 'success', 
    title: 'Automation "New Hire Onboarding" completed',
    time: '2 hours ago',
    user: 'System'
  },
  { 
    id: 5, 
    type: 'error', 
    title: 'ServiceNow integration sync failed',
    time: '3 hours ago',
    user: 'System'
  },
];

export function ActivityFeed() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-gray-900 mb-4">📜 Recent Activity</div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              {activity.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {activity.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
              {activity.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              {activity.type === 'info' && <Clock className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900">{activity.title}</div>
              <div className="text-gray-500 mt-1">
                {activity.time} • {activity.user}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
