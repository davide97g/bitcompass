import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { openai } from 'https://esm.sh/@ai-sdk/openai@3.0.25';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { streamText, tool, type UIMessage } from 'https://esm.sh/ai@6.0.0';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface ChatRequest {
  messages: UIMessage[];
  chatId?: string;
  userId: string; // TODO: Remove this and use JWT token validation instead
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // WARNING: JWT validation is currently disabled for development
    // TODO: Re-enable proper JWT token validation using Authorization header
    // TODO: Remove userId from request body and use authenticated user from JWT instead
    // SECURITY: Currently trusting userId from request body without validation - this is insecure!
    console.warn('⚠️  JWT validation is disabled - trusting userId from request body. This should be fixed before production!');

    // Initialize Supabase clients
    // Get URL from request or environment
    const requestUrl = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       `https://${requestUrl.hostname.split('.')[0]}.supabase.co`;
    
    // Get anon key from request header (sent by frontend) or environment
    const apikey = req.headers.get('apikey');
    const supabaseAnonKey = apikey || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ 
        error: 'Supabase configuration missing',
        details: `URL: ${supabaseUrl ? 'set' : 'missing'}, AnonKey: ${supabaseAnonKey ? 'set' : 'missing'}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role key client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { messages, chatId, userId }: ChatRequest = await req.json();
    
    // Debug: Log incoming messages structure
    console.log('Incoming messages count:', messages?.length || 0);
    if (messages && messages.length > 0) {
      console.log('First message structure:', JSON.stringify({
        id: messages[0].id,
        role: messages[0].role,
        partsCount: messages[0].parts?.length || 0,
        partsTypes: messages[0].parts?.map(p => p.type) || [],
      }, null, 2));
    }

    // Validate userId is provided
    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing userId in request body',
        hint: 'Please provide userId in the request body. Example: {"messages": [...], "userId": "user-uuid"}'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create chat session
    let sessionId = chatId;
    if (!sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return new Response(JSON.stringify({ 
          error: 'Failed to create chat session',
          details: sessionError.message,
          hint: 'Make sure the userId exists in auth.users table'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      sessionId = session.id;
    }

    // Convert UI messages to model messages
    // Manually convert to ensure proper ModelMessage format: {role: 'user'|'assistant', content: string}
    const modelMessagesToUse = messages
      .filter((msg) => {
        // Only include user and assistant messages with valid text parts
        if (msg.role !== 'user' && msg.role !== 'assistant') return false;
        const textParts = msg.parts?.filter((p) => p.type === 'text') || [];
        return textParts.length > 0;
      })
      .map((msg) => {
        // Extract text content from parts
        const textParts = msg.parts?.filter((p) => p.type === 'text') || [];
        const textContent = textParts
          .map((p) => {
            if ('text' in p && typeof p.text === 'string') {
              return p.text;
            }
            return '';
          })
          .join('')
          .trim();
        
        // Return in ModelMessage format: {role, content}
        // Content must be a non-empty string
        if (!textContent || textContent.length === 0) {
          return null;
        }
        
        return {
          role: msg.role as 'user' | 'assistant',
          content: textContent,
        };
      })
      .filter((msg): msg is { role: 'user' | 'assistant'; content: string } => 
        msg !== null && msg.content && msg.content.length > 0
      );
    
    // Ensure we have at least one message
    if (modelMessagesToUse.length === 0) {
      console.error('No valid messages after conversion. Input messages:', JSON.stringify(messages, null, 2));
      return new Response(JSON.stringify({ 
        error: 'No valid messages provided',
        hint: 'Messages must have role "user" or "assistant" with text content'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Converted messages count:', modelMessagesToUse.length);
    console.log('First message:', JSON.stringify(modelMessagesToUse[0], null, 2));

    // Define tools for database queries
    const tools = {
      searchProjects: tool({
        description: 'Search for projects by technology, status, or name',
        parameters: z.object({
          technology: z.string().optional().describe('Technology to search for (e.g., React, GraphQL)'),
          status: z.enum(['active', 'completed', 'on-hold', 'planning']).optional().describe('Project status filter'),
          limit: z.number().optional().default(10).describe('Maximum number of results'),
        }),
        execute: async ({ technology, status, limit = 10 }) => {
          let query = supabase.from('projects').select('*');
          
          if (technology) {
            query = query.contains('tech_stack', [technology]);
          }
          if (status) {
            query = query.eq('status', status);
          }
          
          const { data, error } = await query.limit(limit).order('created_at', { ascending: false });
          
          if (error) {
            return { error: error.message, results: [] };
          }
          
          return {
            results: (data || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              techStack: p.tech_stack || [],
              status: p.status,
            })),
          };
        },
      }),

      searchPeople: tool({
        description: 'Search for people by skills, expertise, or name. Note: People data is currently stored in mockData.',
        parameters: z.object({
          skill: z.string().optional().describe('Skill to search for (e.g., React, Kubernetes)'),
          expertise: z.string().optional().describe('Expertise area (e.g., Frontend, DevOps)'),
          limit: z.number().optional().default(10).describe('Maximum number of results'),
        }),
        execute: async ({ skill, expertise, limit = 10 }) => {
          // For now, return a message that people search is available but data is in frontend
          // In a real implementation, you'd query a people table
          return {
            message: 'People search is available. The data is currently stored in the frontend mockData. Consider creating a people table for full functionality.',
            results: [],
          };
        },
      }),

      searchRules: tool({
        description: 'Search for rules or solutions by query, kind, or technologies',
        parameters: z.object({
          query: z.string().describe('Search query text'),
          kind: z.enum(['rule', 'solution']).optional().describe('Filter by rule or solution'),
          limit: z.number().optional().default(10).describe('Maximum number of results'),
        }),
        execute: async ({ query, kind, limit = 10 }) => {
          let dbQuery = supabase
            .from('rules')
            .select('*')
            .eq('user_id', userId); // TODO: Re-enable RLS validation when JWT auth is restored
          
          if (kind) {
            dbQuery = dbQuery.eq('kind', kind);
          }
          
          // Use full-text search if available, otherwise use ilike
          dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,body.ilike.%${query}%`);
          
          const { data, error } = await dbQuery.limit(limit).order('created_at', { ascending: false });
          
          if (error) {
            return { error: error.message, results: [] };
          }
          
          return {
            results: (data || []).map((r: any) => ({
              id: r.id,
              kind: r.kind,
              title: r.title,
              description: r.description,
              technologies: r.technologies || [],
            })),
          };
        },
      }),

      searchAutomations: tool({
        description: 'Search for automations by category, query, or technologies',
        parameters: z.object({
          category: z.enum(['onboarding', 'deployment', 'monitoring', 'notifications', 'data-sync', 'development', 'other']).optional(),
          query: z.string().optional().describe('Search query text'),
          limit: z.number().optional().default(10).describe('Maximum number of results'),
        }),
        execute: async ({ category, query, limit = 10 }) => {
          let dbQuery = supabase.from('automations').select('*').eq('user_id', userId);
          
          if (category) {
            dbQuery = dbQuery.eq('category', category);
          }
          
          if (query) {
            dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
          }
          
          const { data, error } = await dbQuery.limit(limit).order('created_at', { ascending: false });
          
          if (error) {
            return { error: error.message, results: [] };
          }
          
          return {
            results: (data || []).map((a: any) => ({
              id: a.id,
              title: a.title,
              description: a.description,
              category: a.category,
              benefits: a.benefits || [],
            })),
          };
        },
      }),
    };

    // Configure AI model - use Vercel AI Gateway or direct OpenAI
    const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('AI_API_KEY');
    const gatewayUrl = Deno.env.get('VERCEL_AI_GATEWAY_URL');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let model;
    if (gatewayUrl) {
      // Use Vercel AI Gateway
      model = openai('gpt-4o-mini', {
        baseURL: gatewayUrl,
        apiKey,
      });
    } else {
      // Use direct OpenAI
      model = openai('gpt-4o-mini', {
        apiKey,
      });
    }

    // System prompt
    const systemPrompt = `You are a helpful Knowledge Hub assistant. You help users find information about:
- Projects: Search by technology, status, or name
- People: Find experts by skills or expertise (note: people data is currently in frontend mockData)
- Rules/Solutions: Search for coding rules, best practices, and solutions
- Automations: Find automation workflows and processes

When users ask questions, use the available tools to search the database and provide helpful responses.
Format your responses clearly and include relevant details from the search results.
When presenting results, mention the key technologies, status, or other relevant attributes.`;

    // Stream the response
    // Ensure messages are in the correct format for the AI SDK
    // Create plain objects with only the required fields
    const validatedMessages = modelMessagesToUse.map((msg) => {
      // Ensure role is exactly 'user' or 'assistant'
      const role = msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : null;
      if (!role) {
        throw new Error(`Invalid role: ${msg.role}`);
      }
      
      // Ensure content is a non-empty string
      const content = String(msg.content || '').trim();
      if (!content) {
        throw new Error('Message content cannot be empty');
      }
      
      // Return plain object with only role and content
      return {
        role,
        content,
      };
    });
    
    console.log('Validated messages for streamText:', JSON.stringify(validatedMessages.map(m => ({ role: m.role, contentLength: m.content.length })), null, 2));
    
    const result = streamText({
      model,
      system: systemPrompt,
      messages: validatedMessages,
      tools,
      maxSteps: 5,
    });

    // Consume stream to ensure completion even if client disconnects
    result.consumeStream();

    // Return streaming response with CORS headers
    const streamResponse = result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: finishedMessages }) => {
        // Save messages to database
        try {
          const messagesToSave = finishedMessages.map((msg: UIMessage) => {
            const textPart = msg.parts?.find((p) => p.type === 'text');
            const textContent = textPart && 'text' in textPart ? textPart.text : '';
            
            return {
              chat_id: sessionId,
              role: msg.role,
              content: textContent,
              metadata: {
                parts: msg.parts,
                toolCalls: msg.parts?.filter((p) => p.type === 'tool-call') || [],
              },
            };
          });

          await supabase.from('chat_messages').insert(messagesToSave);
          
          // Update chat session updated_at
          await supabase
            .from('chat_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch (error) {
          console.error('Error saving messages:', error);
        }
      },
    });
    
    // Add CORS headers to the streaming response
    const headers = new Headers(streamResponse.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers: headers,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
