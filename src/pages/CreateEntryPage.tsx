import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateFlowMessage, type CreateFlowMessageData } from '@/components/create/CreateFlowMessage';
import { useEntries } from '@/hooks/use-entries';
import { useToast } from '@/hooks/use-toast';
import { mapRawToEntry, type EntryType, type CreateAnswers } from '@/lib/createEntryMappers';
import { QUESTIONS_BY_TYPE, DEFAULT_COMMANDS } from '@/lib/createFlowConfig';
import type { Problem, Project, Automation } from '@/data/mockData';

type CreateStep =
  | 'type_selection'
  | 'guided_questions'
  | 'run_commands'
  | 'await_command_confirmation'
  | 'collect_json'
  | 'show_preview'
  | 'confirm_or_edit'
  | 'insert_done';

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'problem', label: 'Problem' },
  { value: 'project', label: 'Project' },
  { value: 'automation', label: 'Automation' },
];

export default function CreateEntryPage() {
  const { type: typeParam } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addProblem, addProject, addAutomation } = useEntries();

  const [step, setStep] = useState<CreateStep>('type_selection');
  const [entryType, setEntryType] = useState<EntryType | null>(
    typeParam && ['problem', 'project', 'automation'].includes(typeParam)
      ? (typeParam as EntryType)
      : null
  );
  const [answers, setAnswers] = useState<CreateAnswers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<Problem | Project | Automation | null>(null);
  const [messages, setMessages] = useState<CreateFlowMessageData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const questions = entryType ? QUESTIONS_BY_TYPE[entryType] : [];
  const currentQuestion = questions[currentQuestionIndex];
  const allQuestionsAnswered = entryType && currentQuestionIndex >= questions.length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeParam && ['problem', 'project', 'automation'].includes(typeParam) && messages.length === 0) {
      setEntryType(typeParam as EntryType);
      setStep('guided_questions');
      setMessages([
        {
          id: '1',
          role: 'assistant',
          timestamp: new Date(),
          content: `Creating a new **${typeParam}**. I'll ask a few questions, then you can run some commands and paste the output.\n\n${QUESTIONS_BY_TYPE[typeParam as EntryType][0]?.label ?? 'First question'}:`,
        },
      ]);
    } else if (!typeParam && messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          timestamp: new Date(),
          content: "What would you like to create? Choose one to get started.",
        },
      ]);
    }
  }, [typeParam, messages.length]);

  const appendAssistant = (content: string, blocks?: CreateFlowMessageData['blocks']) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'assistant',
        timestamp: new Date(),
        content,
        blocks,
      },
    ]);
  };

  const appendUser = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: 'user', timestamp: new Date(), content },
    ]);
  };

  const handleSelectType = (type: EntryType) => {
    setEntryType(type);
    setStep('guided_questions');
    setCurrentQuestionIndex(0);
    const q = QUESTIONS_BY_TYPE[type][0];
    appendUser(type);
    appendAssistant(`Creating a new **${type}**. ${q?.label ?? 'First question'}:`);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !inputValue.trim()) return;

    const key = currentQuestion.id;
    setAnswers((prev) => ({ ...prev, [key]: inputValue.trim() }));
    appendUser(inputValue.trim());
    setInputValue('');

    if (currentQuestionIndex + 1 < questions.length) {
      const nextQ = questions[currentQuestionIndex + 1];
      setCurrentQuestionIndex((i) => i + 1);
      appendAssistant(`${nextQ.label}:`);
    } else {
      setStep('await_command_confirmation');
      appendAssistant(
        "Thanks. Next, run these commands in your terminal and paste the JSON output when done.",
        [{ kind: 'commands', content: '', commands: DEFAULT_COMMANDS }, { kind: 'confirmation_buttons', content: '' }]
      );
    }
  };

  const handleCommandSuccess = () => {
    setStep('collect_json');
    appendUser('I ran it successfully');
    appendAssistant("Paste the command output (raw JSON) below and submit.");
  };

  const handleCommandSkip = () => {
    setStep('collect_json');
    appendUser('Skip');
    appendAssistant("No problem. Paste any JSON you have below, or use {} and we'll use your answers only.");
  };

  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = rawJson.trim();
    if (!raw) {
      setJsonError('Enter some JSON or {}');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    setJsonError(null);
    appendUser('Submitted JSON');
    appendAssistant('Here’s a preview of what we captured:', [
      { kind: 'json_preview', content: '', raw },
    ]);

    if (!entryType) return;
    const draft = mapRawToEntry(entryType, parsed, answers);
    setDraftEntry(draft);
    setStep('confirm_or_edit');
    appendAssistant("Here's the entry we'll add. Confirm or request changes.", [
      { kind: 'draft_entry', content: '', entryType, entry: draft },
      { kind: 'confirmation_buttons', content: '' },
    ]);
  };

  const handleConfirmDraft = () => {
    if (!draftEntry || !entryType) return;
    if (entryType === 'problem') {
      addProblem(draftEntry as Problem);
      toast({ title: 'Problem added', description: (draftEntry as Problem).title });
      navigate(`/problems/${(draftEntry as Problem).id}`);
    } else if (entryType === 'project') {
      addProject(draftEntry as Project);
      toast({ title: 'Project added', description: (draftEntry as Project).name });
      navigate(`/projects/${(draftEntry as Project).id}`);
    } else {
      addAutomation(draftEntry as Automation);
      toast({ title: 'Automation added', description: (draftEntry as Automation).title });
      navigate(`/automations/${(draftEntry as Automation).id}`);
    }
    setStep('insert_done');
  };

  const handleEditDraft = () => {
    setStep('collect_json');
    appendUser('Edit');
    appendAssistant("Paste updated JSON below or edit the previous output and submit again.");
  };

  const showTypeChoice = step === 'type_selection' && !entryType && !typeParam;
  const showQuestionForm = step === 'guided_questions' && currentQuestion;
  const showJsonForm = step === 'collect_json';

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Create entry</h1>
          <p className="text-sm text-muted-foreground">
            {entryType ? `New ${entryType}` : 'Choose problem, project, or automation'}
          </p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback
                  className={
                    message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }
                >
                  {message.role === 'assistant' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[80%] min-w-0 ${message.role === 'user' ? 'items-end' : ''}`}>
                <CreateFlowMessage
                  message={message}
                  onCommandSuccess={
                    step === 'await_command_confirmation' || message.blocks?.some((b) => b.kind === 'commands')
                      ? handleCommandSuccess
                      : undefined
                  }
                  onCommandSkip={
                    step === 'await_command_confirmation' || message.blocks?.some((b) => b.kind === 'commands')
                      ? handleCommandSkip
                      : undefined
                  }
                  onConfirmDraft={
                    step === 'confirm_or_edit' && draftEntry ? handleConfirmDraft : undefined
                  }
                  onEditDraft={
                    step === 'confirm_or_edit' && draftEntry ? handleEditDraft : undefined
                  }
                />
              </div>
            </div>
          ))}

          {showTypeChoice && (
            <div className="flex flex-wrap gap-2 pl-11">
              {ENTRY_TYPES.map(({ value, label }) => (
                <Button
                  key={value}
                  variant="outline"
                  onClick={() => handleSelectType(value)}
                  aria-label={`Create ${label}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}

          {showQuestionForm && (
            <form onSubmit={handleAnswerSubmit} className="pl-11 space-y-2">
              <Label htmlFor="create-answer">{currentQuestion.label}</Label>
              {currentQuestion.type === 'textarea' ? (
                <Textarea
                  id="create-answer"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                  rows={3}
                  className="resize-none"
                />
              ) : (
                <Input
                  id="create-answer"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentQuestion.placeholder}
                />
              )}
              <Button type="submit" disabled={currentQuestion.required && !inputValue.trim()}>
                Next
              </Button>
            </form>
          )}

          {showJsonForm && (
            <form onSubmit={handleJsonSubmit} className="pl-11 space-y-2">
              <Label htmlFor="create-json">Paste JSON output</Label>
              <Textarea
                id="create-json"
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  setJsonError(null);
                }}
                placeholder='{"title": "..."} or {}'
                rows={6}
                className="font-mono text-sm resize-none"
              />
              {jsonError && (
                <p className="text-sm text-destructive" role="alert">
                  {jsonError}
                </p>
              )}
              <Button type="submit">Submit</Button>
            </form>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!showTypeChoice && !showQuestionForm && !showJsonForm && step !== 'insert_done' && (
          <form
            className="p-4 border-t bg-background flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (showQuestionForm && inputValue.trim()) {
                handleAnswerSubmit(e);
              }
            }}
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled
              aria-label="Chat input (use buttons above for this flow)"
            />
            <Button type="submit" disabled>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
