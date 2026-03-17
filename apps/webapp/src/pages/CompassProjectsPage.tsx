import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import {
  useCompassProjects,
  useCompassProjectMemberCounts,
  useInsertCompassProject,
  useDeleteCompassProject,
} from '@/hooks/use-compass-projects';
import { useToast } from '@/hooks/use-toast';
import { CompassProjectCard } from '@/components/cards/CompassProjectCard';
import { Layers, Plus } from 'lucide-react';

export default function CompassProjectsPage() {
  const { data: projects = [], isLoading } = useCompassProjects();
  const { data: memberCounts = {} } = useCompassProjectMemberCounts();
  const insertProject = useInsertCompassProject();
  const deleteProject = useDeleteCompassProject();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getErrorMessage = (e: unknown): string | undefined => {
    if (e instanceof Error) return e.message;
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
      return (e as { message: string }).message;
    }
    return undefined;
  };

  const handleCreateSubmit = async () => {
    if (!title.trim()) return;
    try {
      await insertProject.mutateAsync({
        title: title.trim(),
        description: description.trim(),
      });
      toast({ title: 'Project created' });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
    } catch (e) {
      toast({
        title: 'Failed to create project',
        description: getErrorMessage(e) ?? 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteProject.mutateAsync(deleteId);
      toast({ title: 'Project deleted' });
      setDeleteId(null);
    } catch (e) {
      toast({
        title: 'Failed to delete project',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Compass projects" description="Scope rules, skills, and commands by project" />
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Compass projects"
        description="Scope rules, skills, and commands by project. Only members can see and push."
      >
        <Button
          onClick={() => setCreateOpen(true)}
          aria-label="New Compass project"
          className="dark:bg-violet-500 dark:hover:bg-violet-600 dark:text-white dark:border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New project
        </Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {projects.map((project) => (
          <CompassProjectCard
            key={project.id}
            project={project}
            memberCount={memberCounts[project.id] ?? 0}
            onDelete={setDeleteId}
            status="Active"
          />
        ))}
      </div>
      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground dark:text-zinc-400">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No Compass projects yet. Create one to scope rules and commands.</p>
          <Button className="mt-4 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby="create-compass-project-description">
          <DialogHeader>
            <DialogTitle>New Compass project</DialogTitle>
          </DialogHeader>
          <p id="create-compass-project-description" className="text-sm text-muted-foreground">
            You will be added as the first member. Add others from the project page.
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="compass-project-title">Title</Label>
              <Input
                id="compass-project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project name"
                aria-label="Project title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compass-project-description">Description</Label>
              <Input
                id="compass-project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                aria-label="Project description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={!title.trim() || insertProject.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the project and its member list. Rules scoped to this project will become global (visible to everyone).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteProject.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
