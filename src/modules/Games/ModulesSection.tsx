import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoute } from '../../utils/getRoute';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'components/ui/card';

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
  teamId: string;
}

export function ModulesSection({
  modules,
  gameId,
  teamId,
}: ModulesSectionProps) {
  const navigate = useNavigate();

  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Game Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <Card
            key={module.id}
            className="cursor-pointer hover:shadow-lg transition-all group border-gray-200"
            onClick={() => {
              navigate(
                getRoute(module.route, {
                  gameId: gameId,
                  teamId: teamId,
                }),
              );
            }}
          >
            <CardHeader className="pb-2">
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform mx-auto`}
              >
                {module.icon}
              </div>
              <CardTitle className="group-hover:text-indigo-600 transition-colors">
                {module.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{module.description}</CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <div className="flex items-center text-indigo-600 text-sm font-medium">
                <span>Open Module</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
