import { api } from './api';
import { LOCATION_MODULE } from '../constants/modules';
import {
    LIVE_LOCATION_SETTINGS_API,
    LIVE_LOCATION_ENABLE_API,
    LIVE_LOCATION_GAMES_API,
} from '../constants/api-endpoints';
import { LocationSettings, LocationPing } from '../models/Location';

const locationApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getLocationSettings: builder.query<LocationSettings, void>({
            query: () => ({
                url: LIVE_LOCATION_SETTINGS_API,
                method: 'GET',
            }),
            providesTags: [LOCATION_MODULE],
        }),
        enableLocationSharing: builder.mutation<LocationSettings, void>({
            query: () => ({
                url: LIVE_LOCATION_ENABLE_API,
                method: 'POST',
                body: {},
            }),
            invalidatesTags: [LOCATION_MODULE],
        }),
        disableLocationSharing: builder.mutation<LocationSettings, void>({
            query: () => ({
                url: LIVE_LOCATION_ENABLE_API,
                method: 'DELETE',
            }),
            invalidatesTags: [LOCATION_MODULE],
        }),
        deleteLocationSettings: builder.mutation<void, void>({
            query: () => ({
                url: LIVE_LOCATION_SETTINGS_API,
                method: 'DELETE',
            }),
            invalidatesTags: [LOCATION_MODULE],
        }),
        getLocationsForGame: builder.query<LocationPing[], string>({
            query: (gameId) => ({
                url: `${LIVE_LOCATION_GAMES_API}/${gameId}/`,
                method: 'GET',
            }),
            providesTags: [LOCATION_MODULE],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetLocationSettingsQuery,
    useEnableLocationSharingMutation,
    useDisableLocationSharingMutation,
    useDeleteLocationSettingsMutation,
    useGetLocationsForGameQuery,
} = locationApi;
