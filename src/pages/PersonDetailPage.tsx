import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, FolderKanban, CheckCircle2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import { getPersonById, getProjectsByIds, getProblemsByIds } from '@/data/mockData';
import { ProjectCard } from '@/components/cards/ProjectCard';
import { ProblemCard } from '@/components/cards/ProblemCard';

export default function PersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const person = getPersonById(id || '');

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Person not found</p>
        <Button variant="link" onClick={() => navigate('/people')}>
          Back to People
        </Button>
      </div>
    );
  }

  const workedOnProjects = getProjectsByIds(person.projects);
  const solvedProblems = getProblemsByIds(person.problemsSolved);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-4 -ml-2"
        onClick={() => navigate('/people')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to People
      </Button>

      {/* Header */}
      <div className="flex items-start gap-6 mb-6">
        <Avatar className="w-20 h-20">
          <AvatarImage src={person.avatar} alt={person.name} />
          <AvatarFallback className="text-2xl">
            {person.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">{person.name}</h1>
          <p className="text-muted-foreground mb-3">{person.role}</p>
          <a 
            href={`mailto:${person.email}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Mail className="w-4 h-4" />
            {person.email}
          </a>
        </div>
      </div>

      {/* Skills */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {person.skills.map((skill) => (
              <TechTag key={skill} variant={getTechColor(skill)}>
                {skill}
              </TechTag>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Areas of Expertise */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Areas of Expertise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {person.expertise.map((area) => (
              <TechTag key={area} variant={getTechColor(area)}>
                {area}
              </TechTag>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      {workedOnProjects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Projects ({workedOnProjects.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {workedOnProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Solved Problems */}
      {solvedProblems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Problems Solved ({solvedProblems.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {solvedProblems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
