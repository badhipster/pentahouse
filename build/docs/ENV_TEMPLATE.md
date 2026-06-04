# Environment variables

Copy these into `.env.local` (for Next.js) and into n8n credential entries (for workflows). Never commit the populated file.

## Supabase (shared)

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...           # public, safe for browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # SERVER ONLY (n8n + Next.js API routes)
```

## Gemini

```
GEMINI_API_KEY=AIza...                    # from Google AI Studio
GEMINI_MODEL_FLASH=gemini-2.5-flash       # high-volume scoring + drafting
GEMINI_MODEL_PRO=gemini-2.5-pro           # complex qualification, eval audits
```

## Twilio (WhatsApp sandbox)

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # sandbox number
TWILIO_WEBHOOK_URL=https://<ngrok>.ngrok-free.app/webhook/whatsapp-inbound
```

## n8n

```
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_BASE=https://<ngrok>.ngrok-free.app
N8N_APPROVAL_CALLBACK_TOKEN=<random 32 chars>   # shared secret between dashboard and n8n
```

## Next.js (dashboard) extras

```
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_DEMO_MODE=false                     # set true to serve offline JSON fallbacks
N8N_APPROVAL_ENDPOINT=$N8N_WEBHOOK_BASE/webhook/approval-callback
```

## Optional: Slack escalation stub (Q3)

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...   # optional; in-app card works without it
```

## Rotation discipline

- Regenerate `SUPABASE_SERVICE_ROLE_KEY` and `N8N_APPROVAL_CALLBACK_TOKEN` if either is ever pasted into a screenshot/demo recording.
- Twilio sandbox tokens are low-risk but rotate after demo day.
