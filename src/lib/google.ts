
import { RNPlugin } from '@remnote/plugin-sdk';
import { getAccessToken } from './auth';

interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

export const fetchCalendarEvents = async (plugin: RNPlugin, clientId: string, clientSecret: string): Promise<CalendarEvent[]> => {
    const token = await getAccessToken(plugin, clientId, clientSecret);
    if (!token) return [];

    // Fetch events for the primary calendar
    // timeMin=now to get upcoming events
    // singleEvents=true to expand recurring events
    // orderBy=startTime
    const params = new URLSearchParams({
        timeMin: new Date().toISOString(),
        maxResults: '20',
        singleEvents: 'true',
        orderBy: 'startTime',
    });

    try {
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token might be invalid despite refresh check?
                await plugin.app.toast("Google Calendar: Authentication failed.");
            }
            throw new Error(`Calendar API failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (e) {
        console.error("Failed to fetch calendar events", e);
        await plugin.app.toast("Error fetching calendar events. Check console.");
        return [];
    }
};
