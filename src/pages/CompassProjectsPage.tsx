import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  useInsertCompassProject,
  useDeleteCompassProject,
} from '@/hooks/use-compass-projects';
import { useToast } from '@/hooks/use-toast';
import { Layers, Plus, Trash2, Users } from 'lucide-react';

export default function CompassProjectsPage() {
  const { data: projects = [], isLoading } = useCompassProjects();
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
      />
      <div className="flex justify-end mb-6">
        <Button onClick={() => setCreateOpen(true)} aria-label="New Compass project">
          <Plus className="w-4 h-4 mr-2" />
          New project
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/compass-projects/${project.id}`}
                  className="font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  tabIndex={0}
                  aria-label={`Open project ${project.title}`}
                >
                  {project.title}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(project.id)}
                  aria-label={`Delete project ${project.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col">
              {project.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-3">No description</p>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-auto">
                <Users className="w-4 h-4 shrink-0" />
                <span>Members</span>
              </div>
              <Link
                to={`/compass-projects/${project.id}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2"
              >
                Manage project
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No Compass projects yet. Create one to scope rules and commands.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
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
