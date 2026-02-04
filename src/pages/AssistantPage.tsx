import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AssistantMessage } from '@/components/assistant/AssistantMessage';
import { generateAIResponse, type AIMessage } from '@/lib/aiResponses';

export default function AssistantPage() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your Knowledge Hub assistant. I can help you find information about people, projects, problems, and technologies in your organization.\n\nTry asking me things like:\n- \"Who knows Kubernetes?\"\n- \"Which projects use React?\"\n- \"Do we have solutions for performance issues?\"\n- \"Who worked on the Customer Portal?\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const response = generateAIResponse(input.trim());
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
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
                    <p className="text-sm">{message.content}</p>
                  </div>
                ) : (
                  <AssistantMessage message={message} />
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
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
              disabled={isTyping}
            />
            <Button type="submit" disabled={!input.trim() || isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>

      {/* Suggested questions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {['Who knows React?', 'Show me open problems', 'What projects use GraphQL?'].map((question) => (
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
