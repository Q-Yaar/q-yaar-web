import React, { useEffect, useState } from 'react';
import { Header } from '../../components/ui/header';
import { useNavigate } from 'react-router-dom';
import { Radio, Shield, Info, QrCode, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../../components/ui/card';
import {
    useGetLocationSettingsQuery,
    useUpdateLocationSettingsMutation,
    useResetLocationSettingsMutation,
} from '../../apis/locationApi';
import LoadingScreen from 'components/LoadingScreen';
import ErrorScreen from 'components/ErrorScreen';
import { BASE_URL, LOCATION_TRACCAR_API } from 'constants/api-endpoints';

const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';
const TRACCAR_SERVER_URL = BASE_URL + LOCATION_TRACCAR_API;

const APP_STORE_URL = 'https://apps.apple.com/in/app/traccar-client/id843156974';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=org.traccar.client&hl=en_IN';

const SETUP_STEPS = [
    {
        step: 1,
        text: (
            <div className="space-y-2">
                <span>
                    Download the <strong>Traccar Client</strong> app from the Play Store or
                    App Store.
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-md transition-colors no-underline"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.2l2.585 1.493a1 1 0 0 1 0 1.732l-2.586 1.493-2.537-2.537 2.538-2.18zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                        </svg>
                        Play Store
                    </a>
                    <a
                        href={APP_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-md transition-colors no-underline"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        App Store
                    </a>
                </div>
            </div>
        ),
    },
    {
        step: 2,
        text: (
            <>
                Open the app and click on{' '}
                <span className="text-orange-500 font-semibold">"Change Settings"</span>
                .
            </>
        ),
    },
    {
        step: 3,
        text: (
            <span className="inline-flex items-center flex-wrap gap-1">
                Tap the{' '}
                <QrCode className="w-4 h-4" />
                <strong>QR Code icon</strong>{' '}
                in the top right corner.
            </span>
        ),
    },
    {
        step: 4,
        text: <>Scan the QR code shown on this screen.</>,
    },
    {
        step: 5,
        text: (
            <>
                Turn on{' '}
                <span className="text-orange-500 font-semibold">
                    "Continuous Tracking"
                </span>{' '}
                to begin sharing.
            </>
        ),
    },
];

export function LocationSettings() {
    const navigate = useNavigate();

    const {
        data: settings,
        isLoading,
        isError,
        refetch,
    } = useGetLocationSettingsQuery();

    const [updateSettings, { isLoading: isUpdating }] =
        useUpdateLocationSettingsMutation();
    const [resetSettings, { isLoading: isResetting }] =
        useResetLocationSettingsMutation();

    const [isEnabled, setIsEnabled] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (settings) {
            setIsEnabled(settings.is_sharing_enabled);
        }
    }, [settings]);

    const handleToggle = async () => {
        const newValue = !isEnabled;
        setIsEnabled(newValue);
        try {
            await updateSettings({ is_sharing_enabled: newValue }).unwrap();
        } catch (error) {
            console.error('Failed to update location settings:', error);
            setIsEnabled(!newValue); // revert
        }
    };

    const handleReset = async () => {
        if (
            !window.confirm(
                'Are you sure you want to reset location settings? This will clear the tracking code.',
            )
        )
            return;
        try {
            await resetSettings().unwrap();
        } catch (error) {
            console.error('Failed to reset location settings:', error);
        }
    };

    const handleSave = async () => {
        try {
            await updateSettings({ is_sharing_enabled: isEnabled }).unwrap();
        } catch (error) {
            console.error('Failed to save location settings:', error);
        }
    };

    const trackingCode = settings?.tracking_code || '';
    const qrData = `${TRACCAR_SERVER_URL}?id=${trackingCode}`;
    const qrUrl = `${QR_API_BASE}?size=200x200&data=${encodeURIComponent(qrData)}`;

    if (isLoading) return <LoadingScreen />;

    if (isError)
        return (
            <ErrorScreen
                title="Failed to load settings"
                description="Something went wrong while fetching location settings."
                action={refetch}
            />
        );

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <Header
                title="Location Sharing Settings"
                icon={
                    <Radio className="w-5 h-5 text-orange-500" />
                }
                action={
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isResetting}
                        className="w-full sm:w-auto px-8 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                    >
                        {isResetting ? 'Resetting...' : 'Reset Settings'}
                    </Button>
                }
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Toggle Section */}
                <Card className="border-gray-200 shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <Radio className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-left">
                                        Location Sharing
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Enable or disable real-time location tracking for this
                                        device.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggle}
                                disabled={isUpdating}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 flex-shrink-0 ${isEnabled ? 'bg-orange-500' : 'bg-gray-300'
                                    } ${isUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                role="switch"
                                aria-checked={isEnabled}
                                aria-label="Toggle location sharing"
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* QR + Guide Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QR Code Section */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Scan to Configure</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                This QR code can be scanned by the client app to load your
                                tracking settings automatically.
                            </p>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center space-y-5">
                            {/* QR Code Image */}
                            <div className="relative p-3">
                                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-orange-400 rounded-tl-md" />
                                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-orange-400 rounded-tr-md" />
                                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-orange-400 rounded-bl-md" />
                                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-orange-400 rounded-br-md" />
                                <div className="bg-teal-700/10 rounded-lg p-4">
                                    {trackingCode ? (
                                        <img
                                            src={qrUrl}
                                            alt="QR Code for location tracking setup"
                                            className="w-40 h-40 sm:w-48 sm:h-48"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center text-gray-400 text-sm">
                                            Enable sharing to generate QR
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Verification Code */}
                            <div className="text-center space-y-2 w-full">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Device Identifier
                                </p>
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg py-3 px-6">
                                    <span className="text-2xl font-mono font-bold text-orange-500 tracking-[0.5em]">
                                        {trackingCode
                                            ? trackingCode
                                            : '------'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 italic">
                                    Verify that this code matches the one shown in the mobile app. Do not share this code with other teams.
                                </p>
                                {/* Copy Server URL */}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(qrData);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Copy server URL for manual configuration"
                                >
                                    {copied ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                    <span className="truncate max-w-[200px]">{copied ? 'Copied!' : qrData}</span>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Setup Guide Section */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">
                                How to set up the client app
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {SETUP_STEPS.map(({ step, text }) => (
                                <div key={step} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                        {step}
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed pt-1 text-left">
                                        {text}
                                    </p>
                                </div>
                            ))}

                            {/* Note */}
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Info className="w-3 h-3" />
                                </div>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <strong>Note:</strong> Location sharing works best when the
                                    app has "Always" location permissions. Make sure to check your
                                    phone settings.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
