export function StatsSection() {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Game Statistics
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">12</div>
          <div className="text-sm text-gray-600 mt-1">Sessions</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">48h</div>
          <div className="text-sm text-gray-600 mt-1">Play Time</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">5</div>
          <div className="text-sm text-gray-600 mt-1">Players</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">89%</div>
          <div className="text-sm text-gray-600 mt-1">Completion</div>
        </div>
      </div>
    </section>
  );
}