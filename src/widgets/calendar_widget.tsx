
import { renderWidget, usePlugin, useTracker } from '@remnote/plugin-sdk';
import React, { useEffect, useState } from 'react';
import { fetchCalendarEvents } from '../lib/google';

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    htmlLink: string;
}

const CalendarWidget = () => {
    const plugin = usePlugin();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEvents = async () => {
        if (!plugin) return;
        setLoading(true);
        setError(null);
        try {
            const clientId = await plugin.settings.getSetting<string>('clientId');
            const clientSecret = await plugin.settings.getSetting<string>('clientSecret');

            if (!clientId || !clientSecret) {
                setError("Please configure Client ID/Secret in settings.");
                setLoading(false);
                return;
            }

            const fetchedEvents = await fetchCalendarEvents(plugin, clientId, clientSecret);
            setEvents(fetchedEvents);
        } catch (e) {
            setError("Failed to load events.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [plugin]);

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Google Calendar</h2>
                <button
                    onClick={loadEvents}
                    className="p-1 px-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Refresh
                </button>
            </div>

            {loading && <div className="text-gray-500">Loading...</div>}
            {error && <div className="text-red-500 text-sm">{error}</div>}

            {!loading && !error && events.length === 0 && (
                <div className="text-gray-500 text-sm">No upcoming events found.</div>
            )}

            <div className="space-y-2">
                {events.map(event => (
                    <a
                        key={event.id}
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="font-medium text-gray-800 dark:text-gray-200">{event.summary || '(No Title)'}</div>
                        <div className="text-xs text-gray-500">
                            {event.start.dateTime ? new Date(event.start.dateTime).toLocaleString() : event.start.date}
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

renderWidget(CalendarWidget);
