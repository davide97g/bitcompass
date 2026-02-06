# Chat Edge Function

This Edge Function handles AI chat functionality using Vercel AI SDK.

## Environment Variables

The Edge Function requires the following environment variables/secrets:

### Required Secrets (set via Supabase Dashboard or CLI)

1. **OPENAI_API_KEY** or **AI_API_KEY**
   - Your OpenAI API key (or other AI provider key if using Vercel Gateway)
   - Set via: `supabase secrets set OPENAI_API_KEY=your_key_here`

2. **SUPABASE_URL**
   - Your Supabase project URL
   - Usually auto-configured, but can be set explicitly

3. **SUPABASE_ANON_KEY**
   - Your Supabase anonymous key
   - Usually auto-configured

4. **SUPABASE_SERVICE_ROLE_KEY** (optional)
   - Service role key for bypassing RLS if needed
   - Falls back to anon key if not set

### Optional

5. **VERCEL_AI_GATEWAY_URL** (optional)
   - If using Vercel AI Gateway instead of direct OpenAI
   - Format: `https://gateway.vercel.ai/v1`

## Setup Instructions

1. **Set up Supabase secrets:**
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```

2. **Deploy the function:**
   ```bash
   supabase functions deploy chat
   ```

3. **Test locally (optional):**
   ```bash
   supabase functions serve chat
   ```

## Frontend Configuration

The frontend needs these environment variables (already configured):

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## API Endpoint

The function is accessible at:
```
{SUPABASE_URL}/functions/v1/chat
```

## Authentication

The function requires a valid Supabase auth token in the `Authorization` header:
```
Authorization: Bearer {access_token}
```

## Request Format

```json
{
  "messages": [
    {
      "id": "msg-123",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "What projects use React?"
        }
      ]
    }
  ],
  "chatId": "optional-chat-id"
}
```

## Response

The function streams responses using the Vercel AI SDK UI message format.

## Tools Available

The AI assistant has access to these tools:

1. **searchProjects** - Search projects by technology, status, or name
2. **searchPeople** - Search for people by skills (currently returns mock data info)
3. **searchRules** - Search rules and solutions
4. **searchAutomations** - Search automation workflows

## Notes

- The function uses `consumeStream()` to ensure messages are saved even if the client disconnects
- Messages are automatically saved to `chat_messages` table on completion
- Chat sessions are created automatically if `chatId` is not provided
