
import { declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css';
import { initiateAuth, exchangeCodeForToken } from '../lib/auth';
import { fetchCalendarEvents } from '../lib/google';

async function onActivate(plugin: ReactRNPlugin) {
  // Register settings
  await plugin.settings.registerStringSetting({
    id: 'clientId',
    title: 'Google Client ID',
    description: 'Enter your Google Cloud Project Client ID',
  });

  await plugin.settings.registerStringSetting({
    id: 'clientSecret',
    title: 'Google Client Secret',
    description: 'Enter your Google Cloud Project Client Secret',
  });

  // Command to initiate login
  await plugin.app.registerCommand({
    id: 'google-calendar-login',
    name: 'Google Calendar: Login',
    action: async () => {
      const clientId = await plugin.settings.getSetting<string>('clientId');
      if (!clientId) {
        await plugin.app.toast("Please set Client ID in settings first.");
        return;
      }
      await initiateAuth(plugin, clientId);
    },
  });

  // Command to complete login (paste code)
  await plugin.app.registerCommand({
    id: 'google-calendar-complete-login',
    name: 'Google Calendar: Complete Login (Paste URL)',
    action: async () => {
      const clientId = await plugin.settings.getSetting<string>('clientId');
      const clientSecret = await plugin.settings.getSetting<string>('clientSecret');

      if (!clientId || !clientSecret) {
        await plugin.app.toast("Please set Client ID and Secret in settings first.");
        return;
      }

      const url = window.prompt(
        "Complete Login\n\nPaste the full URL from the browser window that opened (it should start with http://127.0.0.1...)"
      );

      if (!url) return;

      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          const success = await exchangeCodeForToken(plugin, clientId, clientSecret, code);
          if (success) {
            await plugin.app.toast("Login successful!");
          }
        } else {
          await plugin.app.toast("Invalid URL: No code found.");
        }
      } catch (e) {
        await plugin.app.toast("Invalid URL format.");
      }
    }
  });

  // Register a sidebar widget to show calendar events
  await plugin.app.registerWidget('calendar_widget', WidgetLocation.RightSidebar, {
    dimensions: { height: 'auto', width: '100%' },
  });
}

async function onDeactivate(_: ReactRNPlugin) { }

declareIndexPlugin(onActivate, onDeactivate);
