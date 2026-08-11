# Cal.com OAuth setup

Trexa uses one Cal.com OAuth connection per interviewer. The interviewer authorizes
Trexa, selects an event type ID, and Trexa creates bookings as that interviewer.

## Cal.com

1. Create an OAuth client in the Cal.com Platform settings.
2. Register the exact callback URL configured as `CalCom:OAuthRedirectUrl`.
3. Enable these scopes:
   `BOOKING_READ BOOKING_WRITE WEBHOOK_READ WEBHOOK_WRITE`.
4. Each interviewer needs a Cal.com event type whose location is Cal Video (or
   another conferencing app that produces a join URL).

## API configuration

Set secrets through environment variables or the production secret store, never in
`appsettings.json`:

```text
CalCom__OAuthClientId
CalCom__OAuthClientSecret
CalCom__OAuthRedirectUrl
CalCom__FrontendSettingsUrl
CalCom__WebhookUrl
```

`WebhookUrl` is the public base URL without the interviewer ID, for example:

```text
https://api.example.com/api/integrations/calcom/webhook
```

Cal.com SaaS requires an HTTPS webhook URL. The API app must also persist its
ASP.NET Core Data Protection keys across deployments because OAuth tokens, webhook
secrets, and OAuth state are protected with Data Protection.

## Interviewer flow

1. Sign in to Trexa as an interviewer.
2. Select **Create Meeting** on an accepted interview. If Cal.com is not connected,
   Trexa starts the connect/create-account flow automatically.
3. Approve access in Cal.com.
4. Copy the numeric ID of the Cal.com event type into Trexa and save it.
5. Create the meeting from the assigned Trexa interview.

Webhook events update Trexa when a booking is cancelled or rescheduled, a meeting
starts or ends, or a recording becomes ready.
