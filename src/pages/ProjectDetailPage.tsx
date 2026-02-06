import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { getPersonsByIds } from '@/data/mockData';
import { useEntries } from '@/hooks/use-entries';
import { ProblemCard } from '@/components/cards/ProblemCard';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { PersonCard } from '@/components/cards/PersonCard';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProjectById, getProblemsByIds } = useEntries();
  const project = getProjectById(id || '');

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const relatedProblems = getProblemsByIds(project.relatedProblems);
  const teamMembers = getPersonsByIds(project.team);

  return (
    <div className="max-w-4xl mx-auto">
      <PageBreadcrumb items={[{ label: 'Projects', href: '/projects' }, { label: project.name }]} />
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-4 -ml-2"
        onClick={() => navigate('/projects')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Projects
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-muted-foreground mb-3">{project.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Started {project.startDate}
          </span>
          {project.endDate && (
            <span>Ended {project.endDate}</span>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tech Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <TechTag key={tech} variant={getTechColor(tech)}>
                {tech}
              </TechTag>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Context */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Context</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{project.context}</p>
        </CardContent>
      </Card>

      {/* Team */}
      {teamMembers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team ({teamMembers.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {teamMembers.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

      {/* Related Problems */}
      {relatedProblems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Related Problems
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedProblems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
