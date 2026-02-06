import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, FolderKanban, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { StatusBadge } from '@/components/ui/status-badge';
import { getPersonsByIds } from '@/data/mockData';
import { useEntries } from '@/hooks/use-entries';
import { ProjectCard } from '@/components/cards/ProjectCard';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { PersonCard } from '@/components/cards/PersonCard';

export default function ProblemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProblemById, getProjectsByIds } = useEntries();
  const problem = getProblemById(id || '');

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Problem not found</p>
        <Button variant="link" onClick={() => navigate('/problems')}>
          Back to Problems
        </Button>
      </div>
    );
  }

  const relatedProjects = getProjectsByIds(problem.relatedProjects);
  const relatedPeople = getPersonsByIds(problem.relatedPeople);

  return (
    <div className="max-w-4xl mx-auto">
      <PageBreadcrumb items={[{ label: 'Problems', href: '/problems' }, { label: problem.title }]} />
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-4 -ml-2"
        onClick={() => navigate('/problems')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Problems
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <StatusBadge status={problem.status} />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Created {problem.createdAt}
          </span>
          {problem.solvedAt && (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Solved {problem.solvedAt}
            </span>
          )}
        </div>
      </div>

      {/* Technologies */}
      <div className="flex flex-wrap gap-2 mb-6">
        {problem.technologies.map((tech) => (
          <TechTag key={tech} variant={getTechColor(tech)}>
            {tech}
          </TechTag>
        ))}
      </div>

      {/* Problem Definition */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Problem Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{problem.description}</p>
        </CardContent>
      </Card>

      {/* Solution */}
      {problem.solution && (
        <Card className="mb-6 border-success/30 bg-success/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-success">
              <CheckCircle2 className="w-4 h-4" />
              Solution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{problem.solution}</p>
          </CardContent>
        </Card>
      )}

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Related Projects
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Related People */}
      {relatedPeople.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            People Involved
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedPeople.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
