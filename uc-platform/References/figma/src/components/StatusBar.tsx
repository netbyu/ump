export function StatusBar() {
  return (
    <div className="bg-gray-800 text-gray-300 px-6 py-2 flex items-center justify-between border-t border-gray-700">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>System Status: Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🏢 Tenant: Acme Corporation</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span>v2.4.1</span>
      </div>
    </div>
  );
}
