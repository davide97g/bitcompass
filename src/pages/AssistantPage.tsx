import { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AssistantMessage } from '@/components/assistant/AssistantMessage';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAuth } from '@/hooks/use-auth';
import type { UIMessage } from 'ai';

const initialMessage: UIMessage = {
  id: 'initial',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: "Hi! I'm your Knowledge Hub assistant. I can help you find information about people, projects, problems, technologies, and automations.\n\nTry asking me things like:\n- \"Who knows Kubernetes?\"\n- \"Which projects use React?\"\n- \"Find an automation for E2E tests\"\n- \"Suggest an automation for SonarQube\"\n- \"Who worked on the Customer Portal?\"",
    },
  ],
};

export default function AssistantPage() {
  const { session } = useAuth();
  const [chatId, setChatId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

  const { messages, sendMessage, status, input, setInput, error } = useChat({
    id: chatId,
    initialMessages: [initialMessage],
    transport: new DefaultChatTransport({
      api: `${supabaseUrl}/functions/v1/chat`,
      headers: async () => {
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }
        return {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        };
      },
      body: () => ({
        chatId: chatId || undefined,
      }),
    }),
    onFinish: ({ messages: finishedMessages }) => {
      // Chat ID will be set from the first response if not already set
      if (!chatId && finishedMessages.length > 0) {
        // The Edge Function returns chatId in response, but we'll track it locally
        // For now, generate a local ID or get it from the response metadata
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    sendMessage({ text: input });
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Ask about people, projects, and knowledge</p>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col border">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className={message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                  {message.role === 'assistant' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[80%] ${message.role === 'user' ? 'items-end' : ''}`}>
                {message.role === 'user' ? (
                  <div className="chat-bubble chat-bubble-user">
                    <p className="text-sm">
                      {message.parts
                        .filter((p) => p.type === 'text')
                        .map((p) => ('text' in p ? p.text : ''))
                        .join('')}
                    </p>
                  </div>
                ) : (
                  <AssistantMessage message={message} />
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {(status === 'submitted' || status === 'streaming') && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="chat-bubble chat-bubble-assistant">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-destructive text-destructive-foreground">
                  <Sparkles className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="chat-bubble chat-bubble-assistant bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">
                  An error occurred. Please try again.
                </p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about people, projects, or problems..."
              className="flex-1"
              disabled={status !== 'ready'}
            />
            <Button type="submit" disabled={!input.trim() || status !== 'ready'}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>

      {/* Suggested questions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {['Who knows React?', 'Show me open problems', 'What projects use GraphQL?', 'Find an automation for E2E tests'].map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setInput(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
