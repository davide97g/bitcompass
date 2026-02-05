import { CommandBlock } from '@/components/create/CommandBlock';
import { DraftEntryCard } from '@/components/create/DraftEntryCard';
import { JsonPreview } from '@/components/create/JsonPreview';
import { Button } from '@/components/ui/button';
import type { Automation, Problem, Project } from '@/data/mockData';
import type { EntryType } from '@/lib/createEntryMappers';
import { cn } from '@/lib/utils';

export type CreateFlowMessageKind =
  | 'text'
  | 'question'
  | 'commands'
  | 'json_preview'
  | 'draft_entry'
  | 'confirmation_buttons';

export interface CreateFlowMessagePayload {
  kind: 'text';
  content: string;
}

export interface CreateFlowQuestionPayload {
  kind: 'question';
  content: string;
  questionId?: string;
}

export interface CreateFlowCommandsPayload {
  kind: 'commands';
  content: string;
  commands: string[];
}

export interface CreateFlowJsonPreviewPayload {
  kind: 'json_preview';
  content: string;
  raw: string;
}

export interface CreateFlowDraftEntryPayload {
  kind: 'draft_entry';
  content: string;
  entryType: EntryType;
  entry: Problem | Project | Automation;
}

export interface CreateFlowConfirmationButtonsPayload {
  kind: 'confirmation_buttons';
  content: string;
}

export type CreateFlowMessageBlock =
  | CreateFlowMessagePayload
  | CreateFlowQuestionPayload
  | CreateFlowCommandsPayload
  | CreateFlowJsonPreviewPayload
  | CreateFlowDraftEntryPayload
  | CreateFlowConfirmationButtonsPayload;

export interface CreateFlowMessageData {
  id: string;
  role: 'assistant' | 'user';
  timestamp: Date;
  /** For assistant messages, optional blocks to render below the main content */
  blocks?: CreateFlowMessageBlock[];
  /** Main text (for assistant) or user reply (for user) */
  content?: string;
}

interface CreateFlowMessageProps {
  message: CreateFlowMessageData;
  onCommandSuccess?: () => void;
  onCommandSkip?: () => void;
  onConfirmDraft?: () => void;
  onEditDraft?: () => void;
  className?: string;
}

export function CreateFlowMessage({
  message,
  onCommandSuccess,
  onCommandSkip,
  onConfirmDraft,
  onEditDraft,
  className,
}: CreateFlowMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className={cn('flex justify-end', className)}>
        <div className="chat-bubble chat-bubble-user max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {message.content && (
        <div className="chat-bubble chat-bubble-assistant">
          <p className="text-sm whitespace-pre-line">{message.content}</p>
        </div>
      )}
      {message.blocks?.map((block, index) => {
        if (block.kind === 'commands') {
          return (
            <CommandBlock key={index} commands={block.commands} />
          );
        }
        if (block.kind === 'json_preview') {
          return (
            <div key={index} className="space-y-2">
              {block.content && (
                <p className="text-sm text-muted-foreground">{block.content}</p>
              )}
              <JsonPreview raw={block.raw} defaultOpen />
            </div>
          );
        }
        if (block.kind === 'draft_entry') {
          return (
            <div key={index} className="space-y-2">
              {block.content && (
                <p className="text-sm text-muted-foreground">{block.content}</p>
              )}
              <DraftEntryCard type={block.entryType} entry={block.entry} />
            </div>
          );
        }
        if (block.kind === 'confirmation_buttons') {
          return (
            <div key={index} className="flex flex-wrap gap-2">
              {onCommandSuccess && (
                <Button onClick={onCommandSuccess} aria-label="I ran the commands successfully">
                  I ran it successfully
                </Button>
              )}
              {onCommandSkip && (
                <Button variant="outline" onClick={onCommandSkip} aria-label="Skip this step">
                  Skip
                </Button>
              )}
              {onConfirmDraft && (
                <Button onClick={onConfirmDraft} aria-label="Confirm and add entry">
                  Confirm and add
                </Button>
              )}
              {onEditDraft && (
                <Button variant="outline" onClick={onEditDraft} aria-label="Edit draft">
                  Edit
                </Button>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
