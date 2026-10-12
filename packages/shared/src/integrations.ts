import type { IntegrationProviderId } from '@unison/types';

export interface IntegrationProviderDefinition {
  id: IntegrationProviderId;
  name: string;
  category: 'chat' | 'mail' | 'calendar' | 'files' | 'dev' | 'support' | 'automation';
  oauthReady: boolean;
  /** Env var NAMES only — never values */
  envVarNames: string[];
  description: string;
}

/** In-product Integrations Center registry (not Cursor Connect). */
export const INTEGRATION_REGISTRY: IntegrationProviderDefinition[] = [
  {
    id: 'slack',
    name: 'Slack',
    category: 'chat',
    oauthReady: true,
    envVarNames: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET', 'SLACK_SIGNING_SECRET'],
    description: 'Post updates and receive slash-command style triggers (architecture).',
  },
  {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    category: 'chat',
    oauthReady: true,
    envVarNames: ['TEAMS_CLIENT_ID', 'TEAMS_CLIENT_SECRET'],
    description: 'Channel notifications and adaptive-card style payloads.',
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365 Mail',
    category: 'mail',
    oauthReady: true,
    envVarNames: ['OUTLOOK_CLIENT_ID', 'OUTLOOK_CLIENT_SECRET'],
    description: 'Send mail via Microsoft Graph when configured.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'mail',
    oauthReady: true,
    envVarNames: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET'],
    description: 'Send mail via Gmail API when configured.',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    category: 'calendar',
    oauthReady: true,
    envVarNames: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET'],
    description: 'Sync due dates to calendar events.',
  },
  {
    id: 'microsoft_calendar',
    name: 'Microsoft Calendar',
    category: 'calendar',
    oauthReady: true,
    envVarNames: ['MS_CALENDAR_CLIENT_ID', 'MS_CALENDAR_CLIENT_SECRET'],
    description: 'Sync due dates to Outlook calendar.',
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'files',
    oauthReady: true,
    envVarNames: ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_SECRET'],
    description: 'Attach Drive files with permission-safe links.',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    category: 'files',
    oauthReady: true,
    envVarNames: ['ONEDRIVE_CLIENT_ID', 'ONEDRIVE_CLIENT_SECRET'],
    description: 'Attach OneDrive files.',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'files',
    oauthReady: true,
    envVarNames: ['DROPBOX_CLIENT_ID', 'DROPBOX_CLIENT_SECRET'],
    description: 'Attach Dropbox files.',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    category: 'files',
    oauthReady: true,
    envVarNames: ['SHAREPOINT_CLIENT_ID', 'SHAREPOINT_CLIENT_SECRET'],
    description: 'SharePoint document libraries.',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'chat',
    oauthReady: true,
    envVarNames: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
    description: 'Meeting links from automations.',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'dev',
    oauthReady: true,
    envVarNames: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    description: 'Issues / PRs linked to items.',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'dev',
    oauthReady: true,
    envVarNames: ['GITLAB_CLIENT_ID', 'GITLAB_CLIENT_SECRET'],
    description: 'Merge requests linked to items.',
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'dev',
    oauthReady: true,
    envVarNames: ['JIRA_CLIENT_ID', 'JIRA_CLIENT_SECRET', 'JIRA_BASE_URL'],
    description: 'Bidirectional issue sync architecture.',
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'dev',
    oauthReady: true,
    envVarNames: ['FIGMA_CLIENT_ID', 'FIGMA_CLIENT_SECRET'],
    description: 'Embed design links on items.',
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    category: 'support',
    oauthReady: true,
    envVarNames: ['ZENDESK_CLIENT_ID', 'ZENDESK_CLIENT_SECRET', 'ZENDESK_SUBDOMAIN'],
    description: 'Support ticket ↔ item linking.',
  },
  {
    id: 'webhooks',
    name: 'Outgoing webhooks',
    category: 'automation',
    oauthReady: false,
    envVarNames: ['WEBHOOK_SIGNING_SECRET'],
    description: 'Signed HTTP webhooks with delivery log.',
  },
  {
    id: 'zapier',
    name: 'Zapier / Make',
    category: 'automation',
    oauthReady: false,
    envVarNames: ['ZAPIER_HOOK_SIGNING_SECRET'],
    description: 'Inbound/outbound automation bridges.',
  },
];

export function getIntegrationProvider(id: IntegrationProviderId): IntegrationProviderDefinition | undefined {
  return INTEGRATION_REGISTRY.find((p) => p.id === id);
}

/**
 * Mock OAuth connect — stores credentialRef only, never a real token.
 * Real OAuth requires owner-configured env vars (names above).
 */
export function mockConnectProvider(providerId: IntegrationProviderId): {
  status: 'connected_mock';
  credentialRef: string;
  scopes: string[];
} {
  return {
    status: 'connected_mock',
    credentialRef: `cred_ref_${providerId}_${Date.now().toString(36)}`,
    scopes: ['read', 'write'],
  };
}
