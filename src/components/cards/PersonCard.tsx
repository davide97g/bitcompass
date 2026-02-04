import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TechTag, getTechColor } from '@/components/ui/tech-tag';
import type { Person } from '@/data/mockData';

interface PersonCardProps {
  person: Person;
}

export function PersonCard({ person }: PersonCardProps) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="card-interactive cursor-pointer border"
      onClick={() => navigate(`/people/${person.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={person.avatar} alt={person.name} />
            <AvatarFallback>{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{person.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{person.role}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {person.skills.slice(0, 4).map((skill) => (
                <TechTag key={skill} variant={getTechColor(skill)}>
                  {skill}
                </TechTag>
              ))}
              {person.skills.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{person.skills.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
