import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRoute } from "../../utils/getRoute";

export interface GameModule {
  id: number;
  name: string;
  icon: string;
  description: string;
  color: string;
  route: string;
}

interface ModulesSectionProps {
  modules: GameModule[];
  gameId: string;
}

export function ModulesSection({ modules, gameId }: ModulesSectionProps) {
  const navigate = useNavigate();

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Game Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <button
            key={module.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all group text-left"
            onClick={() => {
              navigate(
                getRoute(module.route, {
                  gameId: gameId,
                })
              );
            }}
          >
            <div
              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}
            >
              {module.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
              {module.name}
            </h3>
            <p className="text-sm text-gray-600">{module.description}</p>
            <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium">
              <span>Open Module</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}