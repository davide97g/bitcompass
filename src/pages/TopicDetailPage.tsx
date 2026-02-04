import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, FolderKanban, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { getTopicById, getProjectsByIds, getProblemsByIds, getPersonsByIds } from '@/data/mockData';
import { ProjectCard } from '@/components/cards/ProjectCard';
import { ProblemCard } from '@/components/cards/ProblemCard';
import { PersonCard } from '@/components/cards/PersonCard';
import { Monitor, Server, Brain, Shield, Database } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor,
  Server,
  Brain,
  Shield,
  Database,
};

export default function TopicDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const topic = getTopicById(id || '');

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Topic not found</p>
        <Button variant="link" onClick={() => navigate('/topics')}>
          Back to Topics
        </Button>
      </div>
    );
  }

  const Icon = iconMap[topic.icon] || Monitor;
  const relatedProjects = getProjectsByIds(topic.relatedProjects);
  const relatedProblems = getProblemsByIds(topic.relatedProblems);
  const relatedPeople = getPersonsByIds(topic.relatedPeople);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-4 -ml-2"
        onClick={() => navigate('/topics')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Topics
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-1">{topic.name}</h1>
          <p className="text-muted-foreground">{topic.description}</p>
        </div>
      </div>

      {/* Technologies */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Technologies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topic.technologies.map((tech) => (
              <TechTag key={tech} variant={getTechColor(tech)}>
                {tech}
              </TechTag>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Tips & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {topic.tips.map((tip, index) => (
              <li key={index} className="flex gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

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

      {/* Related People */}
      {relatedPeople.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Experts
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
