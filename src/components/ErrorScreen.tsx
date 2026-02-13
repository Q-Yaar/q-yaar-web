import { Button } from './ui/button';

export default function ErrorScreen({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6 max-w-sm bg-white rounded-xl shadow-lg border border-red-100">
        <div className="text-red-500 mb-3">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-gray-500 text-sm mt-2 mb-4">{description}</p>
        <button
          onClick={action}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
