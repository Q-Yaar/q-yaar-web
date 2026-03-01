import { api } from './api';
import { LOCATION_MODULE } from '../constants/modules';
import {
    LOCATION_SETTINGS_API,
    LOCATION_SETTINGS_RESET_API,
    LOCATION_LAST_API,
    LOCATION_TRACCAR_API,
} from '../constants/api-endpoints';
import { LocationSettings, LocationPing } from '../models/Location';

const locationApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getLocationSettings: builder.query<LocationSettings, void>({
            query: (params) => ({
                url: LOCATION_SETTINGS_API,
                method: 'GET',
            }),
            providesTags: [LOCATION_MODULE],
        }),
        updateLocationSettings: builder.mutation<
            LocationSettings,
            { is_sharing_enabled: boolean }
        >({
            query: (body) => ({
                url: LOCATION_SETTINGS_API,
                method: 'POST',
                body,
            }),
            invalidatesTags: [LOCATION_MODULE],
        }),
        resetLocationSettings: builder.mutation<LocationSettings, void>({
            query: () => ({
                url: LOCATION_SETTINGS_RESET_API,
                method: 'POST',
                body: {},
            }),
            invalidatesTags: [LOCATION_MODULE],
        }),
        getLastLocation: builder.query<LocationPing[], { player_ids: string[] }>({
            query: (params) => ({
                url: LOCATION_LAST_API,
                method: 'GET',
                params: {
                    player_ids: params?.player_ids?.join(','),
                },
            }),
            providesTags: [LOCATION_MODULE],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetLocationSettingsQuery,
    useUpdateLocationSettingsMutation,
    useResetLocationSettingsMutation,
    useGetLastLocationQuery,
} = locationApi;
