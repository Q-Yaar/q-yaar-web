import { ChevronRight, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoute } from '../../utils/getRoute';
import { LOCATION_SETTINGS_ROUTE } from '../../constants/routes';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from 'components/ui/card';
import {
    useGetLocationSettingsQuery,
} from '../../apis/locationApi';

interface LocationCardProps {
    gameId: string;
}

export function LocationCard({ gameId }: LocationCardProps) {
    const navigate = useNavigate();
    const { data: settings, isLoading } = useGetLocationSettingsQuery();
    const isEnabled = settings?.is_sharing_enabled ?? false;

    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-all group border-gray-200 hover:border-indigo-300"
            onClick={() =>
                navigate(getRoute(LOCATION_SETTINGS_ROUTE, { gameId }))
            }
        >
            <CardHeader className="pb-2">
                <div className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform mx-auto">
                    <Radio className="w-6 h-6 text-teal-600" />
                    {!isLoading && isEnabled && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                </div>
                <CardTitle className="group-hover:text-indigo-600 transition-colors">
                    Location Sharing
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-1">
                {isLoading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    </div>
                ) : (
                    <p
                        className={`text-sm font-medium ${isEnabled ? 'text-emerald-600' : 'text-gray-500'
                            }`}
                    >
                        Location Sharing: {isEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                )}
            </CardContent>
            <CardFooter className="justify-center">
                <div className="flex items-center text-indigo-600 text-sm font-medium">
                    <span>Settings</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
            </CardFooter>
        </Card>
    );
}
