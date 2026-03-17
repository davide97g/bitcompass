import { topics } from '@/data/mockData';
import { PageHeader } from '@/components/ui/page-header';
import { TopicCard } from '@/components/cards/TopicCard';

export default function TopicsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="Topics & Areas" 
        description="Explore knowledge areas, technologies, and best practices"
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 stagger-children">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  );
}
