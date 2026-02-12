import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import {
  useCompassProject,
  useCompassProjectMembers,
  useUpdateCompassProject,
  useAddCompassProjectMember,
  useRemoveCompassProjectMember,
} from '@/hooks/use-compass-projects';
import { useProfilesSearch, useProfilesByIds } from '@/hooks/use-profiles';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, LogOut, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';

export default function CompassProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: project, isLoading: projectLoading } = useCompassProject(id);
  const { data: members = [], isLoading: membersLoading } = useCompassProjectMembers(id);
  const updateProject = useUpdateCompassProject();
  const addMember = useAddCompassProjectMember();
  const removeMember = useRemoveCompassProjectMember();
  const { toast } = useToast();

  const memberIds = useMemo(() => members.map((m) => m.user_id), [members]);
  const { data: profiles = [] } = useProfilesByIds(memberIds);
  const profileMap = useMemo(() => {
    const m: Record<string, (typeof profiles)[0]> = {};
    profiles.forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');

  const { data: searchResults = [], isLoading: searchLoading } = useProfilesSearch(searchQuery);
  const existingIds = new Set(memberIds);
  const addableProfiles = searchResults.filter((p) => !existingIds.has(p.id));

  const handleSaveTitle = async () => {
    if (!id || !titleValue.trim()) return;
    try {
      await updateProject.mutateAsync({ id, updates: { title: titleValue.trim() } });
      toast({ title: 'Title updated' });
      setEditingTitle(false);
    } catch (e) {
      toast({
        title: 'Failed to update title',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      await updateProject.mutateAsync({ id, updates: { description: descriptionValue } });
      toast({ title: 'Description updated' });
      setEditingDescription(false);
    } catch (e) {
      toast({
        title: 'Failed to update description',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!id) return;
    try {
      await addMember.mutateAsync({ projectId: id, userId });
      toast({ title: 'Member added' });
      setSearchQuery('');
    } catch (e) {
      toast({
        title: 'Failed to add member',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      await removeMember.mutateAsync({ projectId: id, userId });
      toast({ title: 'Member removed' });
    } catch (e) {
      toast({
        title: 'Failed to remove member',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleLeaveProject = () => {
    if (!id || !currentUser?.id) return;
    handleRemoveMember(currentUser.id).then(() => navigate('/compass-projects'));
  };

  if (projectLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate('/compass-projects')}>
          Back to Compass projects
        </Button>
      </div>
    );
  }

  const showTitleEdit = editingTitle;
  const showDescriptionEdit = editingDescription;

  return (
    <div className="max-w-4xl mx-auto">
      <PageBreadcrumb
        items={[
          { label: 'Compass projects', href: '/compass-projects' },
          { label: project.title },
        ]}
      />
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate('/compass-projects')}
        aria-label="Back to Compass projects"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Compass projects
      </Button>

      {/* Title */}
      <div className="mb-6">
        {showTitleEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={titleValue || project.title}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Project title"
              className="max-w-md"
              aria-label="Project title"
            />
            <Button size="sm" onClick={handleSaveTitle} disabled={updateProject.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTitle(true);
                setTitleValue(project.title);
              }}
              aria-label="Edit title"
            >
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        {showDescriptionEdit ? (
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              value={descriptionValue !== '' ? descriptionValue : project.description}
              onChange={(e) => setDescriptionValue(e.target.value)}
              placeholder="Optional description"
              aria-label="Project description"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDescription} disabled={updateProject.isPending}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingDescription(false);
                  setDescriptionValue('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-muted-foreground flex-1">
              {project.description || <span className="italic">No description</span>}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingDescription(true);
                setDescriptionValue(project.description);
              }}
              aria-label="Edit description"
            >
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add member: search */}
          <div className="space-y-2">
            <Label htmlFor="member-search">Add member</Label>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="member-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or name"
                  className="pl-9"
                  aria-label="Search users to add as member"
                />
              </div>
            </div>
            {searchQuery.trim() && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {searchLoading && <div className="p-2 text-sm text-muted-foreground">Searching…</div>}
                {!searchLoading && addableProfiles.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    No users found or already members
                  </div>
                )}
                {addableProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">
                        {profile.full_name || profile.email || profile.id}
                      </span>
                      {profile.email && profile.full_name && (
                        <span className="text-muted-foreground text-sm ml-2">{profile.email}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddMember(profile.id)}
                      disabled={addMember.isPending}
                      aria-label={`Add ${profile.full_name || profile.email} as member`}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member list */}
          <div className="space-y-2">
            <Label>Current members</Label>
            {membersLoading && <div className="text-sm text-muted-foreground">Loading members…</div>}
            {!membersLoading && members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
            <ul className="divide-y rounded-md border">
              {members.map((member) => {
                const profile = profileMap[member.user_id];
                const isCurrentUser = member.user_id === currentUser?.id;
                const displayName =
                  profile?.full_name || profile?.email || member.user_id.slice(0, 8);
                return (
                  <li
                    key={member.user_id}
                    className="flex items-center justify-between gap-2 p-3"
                  >
                    <div>
                      <span className="font-medium">{displayName}</span>
                      {profile?.email && (
                        <span className="text-muted-foreground text-sm ml-2">{profile.email}</span>
                      )}
                      {isCurrentUser && (
                        <span className="text-muted-foreground text-xs ml-2">(you)</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        isCurrentUser ? handleLeaveProject() : handleRemoveMember(member.user_id)
                      }
                      disabled={removeMember.isPending}
                      aria-label={
                        isCurrentUser
                          ? 'Leave project'
                          : `Remove ${displayName} from project`
                      }
                    >
                      {isCurrentUser ? (
                        <>
                          <LogOut className="w-4 h-4 mr-1" />
                          Leave
                        </>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link to="/rules" className="text-sm text-primary hover:underline">
          View rules scoped to this project
        </Link>
      </div>
    </div>
  );
}
