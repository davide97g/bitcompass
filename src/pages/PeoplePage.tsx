import { people } from '@/data/mockData';
import { PageHeader } from '@/components/ui/page-header';
import { PersonCard } from '@/components/cards/PersonCard';

export default function PeoplePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="People" 
        description="Discover your colleagues' expertise and track records"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}
