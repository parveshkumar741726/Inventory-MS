'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Page</h1>
        <p className="text-gray-600">If you can see this page, the frontend is working correctly.</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500">Next.js is running properly</p>
          <p className="text-sm text-gray-500">Tailwind CSS is working</p>
          <p className="text-sm text-gray-500">Components are loading</p>
        </div>
      </div>
    </div>
  );
}
