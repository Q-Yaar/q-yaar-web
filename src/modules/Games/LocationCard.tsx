import { ChevronRight, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoute } from '../../utils/getRoute';
import { LOCATION_SETTINGS_ROUTE } from '../../constants/routes';
import {
    Card,
    CardContent,
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
            <CardContent className="flex items-center gap-4 py-4">
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Radio className="w-5 h-5 text-teal-600" />
                    {!isLoading && isEnabled && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                    <CardTitle className="text-base group-hover:text-indigo-600 transition-colors">
                        Location Sharing
                    </CardTitle>
                    {isLoading ? (
                        <div className="animate-pulse mt-1">
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                    ) : (
                        <p className={`text-sm ${isEnabled ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
            </CardContent>
        </Card>
    );
}
