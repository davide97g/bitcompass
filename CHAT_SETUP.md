# Chatbot Setup Guide

This guide explains how to set up the AI chatbot feature.

## Prerequisites

1. Supabase project with database migrations applied
2. OpenAI API key (or Vercel AI Gateway configured)
3. Supabase CLI installed (for deploying Edge Functions)

## Step 1: Apply Database Migrations

Run the chat-related migrations:

```bash
supabase db push
```

Or apply via Supabase Dashboard:
- Go to SQL Editor
- Run the migration files in order:
  - `20250206000001_create_chat_sessions_table.sql`
  - `20250206000002_create_chat_messages_table.sql`

## Step 2: Configure Edge Function Secrets

Set the required secrets for the Edge Function:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Optional: Set service role key if you need RLS bypass
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Or via Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add `OPENAI_API_KEY` with your OpenAI API key
3. Optionally add `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Deploy Edge Function

Deploy the chat Edge Function:

```bash
supabase functions deploy chat
```

## Step 4: Frontend Environment Variables

Ensure your `.env` file (or environment) has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

These should already be configured for your Supabase setup.

## Step 5: Test the Chatbot

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/assistant` in your app
3. Try asking questions like:
   - "What projects use React?"
   - "Show me open problems"
   - "Find an automation for E2E tests"

## Troubleshooting

### Edge Function Not Found

- Ensure the function is deployed: `supabase functions deploy chat`
- Check the function URL matches your Supabase project URL

### Authentication Errors

- Ensure you're logged in to the app
- Check that the Supabase auth token is being sent in the request headers

### AI API Errors

- Verify `OPENAI_API_KEY` is set correctly
- Check your OpenAI account has sufficient credits
- For free plan limitations, consider using a smaller model or implementing response chunking

### Database Errors

- Ensure migrations are applied
- Check RLS policies allow the current user to read/write chat data
- Verify `chat_sessions` and `chat_messages` tables exist

## Using Vercel AI Gateway (Optional)

If you want to use Vercel AI Gateway instead of direct OpenAI:

1. Set up Vercel AI Gateway
2. Set the gateway URL:
   ```bash
   supabase secrets set VERCEL_AI_GATEWAY_URL=https://gateway.vercel.ai/v1
   ```
3. Update the Edge Function to use the gateway (already configured)

## Free Plan Considerations

Supabase Edge Functions on the free plan have execution time limits. The implementation uses `consumeStream()` to ensure responses complete even if the client disconnects, but very long AI responses may still timeout.

Consider:
- Using faster/smaller models (e.g., `gpt-4o-mini`)
- Implementing response chunking for very long conversations
- Monitoring function execution times
