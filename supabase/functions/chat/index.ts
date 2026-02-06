import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { openai } from 'https://esm.sh/@ai-sdk/openai@1.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'https://esm.sh/ai@6.0.0';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  messages: UIMessage[];
  chatId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header and apikey
    const authHeader = req.headers.get('Authorization');
    const apikey = req.headers.get('apikey');
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase clients
    // Get URL from request or environment
    const requestUrl = new URL(req.url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       `https://${requestUrl.hostname.split('.')[0]}.supabase.co`;
    
    // Get anon key from request header (sent by frontend) or environment
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
    
    // Use anon key client to validate user token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError?.message, userError);
      return new Response(JSON.stringify({ 
        error: 'Invalid token', 
        details: userError?.message || 'Unable to authenticate user' 
      }), {
        status: 401,
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
    const { messages, chatId }: ChatRequest = await req.json();

    // Get or create chat session
    let sessionId = chatId;
    if (!sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (sessionError) {
        return new Response(JSON.stringify({ error: 'Failed to create chat session' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      sessionId = session.id;
    }

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

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
            .eq('user_id', user.id); // RLS ensures user can only see their own rules
          
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
          let dbQuery = supabase.from('automations').select('*').eq('user_id', user.id);
          
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
    
    let model;
    if (gatewayUrl && apiKey) {
      // Use Vercel AI Gateway
      model = openai(gatewayUrl, {
        apiKey,
      });
    } else if (apiKey) {
      // Use direct OpenAI
      model = openai('gpt-4o-mini', {
        apiKey,
      });
    } else {
      return new Response(JSON.stringify({ error: 'AI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      maxSteps: 5,
    });

    // Consume stream to ensure completion even if client disconnects
    result.consumeStream();

    // Return streaming response
    return result.toUIMessageStreamResponse({
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
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
