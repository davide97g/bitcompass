# Pagination Best Practices

Rules and guidelines for implementing pagination in React/TypeScript applications.

## Reset Pagination When Filters Change

When a page has both **filters** and **pagination**, always reset the page to 1 when:

- A filter value changes (`onFiltersChange`)
- All filters are cleared (`onResetFilters`)
- Search query changes (`onSearchChange`)

This avoids showing empty pages or incorrect results when filters reduce the total number of items.

### Implementation Pattern

```tsx
const [page, setPage] = useState(1);
const [filters, setFilters] = useState<FilterState>({});

const handleFiltersChange = (newFilters: FilterState) => {
  setFilters(newFilters);
  setPage(1); // Reset to first page
};

const handleResetFilters = () => {
  setFilters({});
  setPage(1); // Reset to first page
};

const handleSearchChange = (query: string) => {
  setSearchQuery(query);
  setPage(1); // Reset to first page
};
```

## Pagination State Management

- Use `useState` for local pagination state (page, pageSize)
- Store pagination state in URL query parameters for shareable/bookmarkable pages
- Use `useSearchParams` (Next.js) or `useSearchParams` (React Router) for URL-based pagination

### URL-Based Pagination Pattern

```tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const page = parseInt(searchParams.get('page') || '1', 10);
const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

const handlePageChange = (newPage: number) => {
  setSearchParams({ ...Object.fromEntries(searchParams), page: newPage.toString() });
};
```

## Page Size Options

- Provide common page size options: 10, 25, 50, 100
- Default to 10 or 25 items per page
- Allow users to change page size (resets to page 1)
- Store user preference in localStorage if appropriate

```tsx
const [pageSize, setPageSize] = useState(25);

const handlePageSizeChange = (newSize: number) => {
  setPageSize(newSize);
  setPage(1); // Reset to first page when changing page size
};
```

## Server-Side vs Client-Side Pagination

### Client-Side Pagination
- Use when dataset is small (< 1000 items)
- Filter and paginate in-memory
- Good for static or cached data

```tsx
const startIndex = (page - 1) * pageSize;
const endIndex = startIndex + pageSize;
const paginatedItems = filteredItems.slice(startIndex, endIndex);
const totalPages = Math.ceil(filteredItems.length / pageSize);
```

### Server-Side Pagination
- Use when dataset is large or dynamic
- Fetch only current page from API
- Include total count in API response

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['items', page, pageSize, filters],
  queryFn: () => fetchItems({ page, pageSize, ...filters }),
});

const totalPages = Math.ceil(data?.totalCount / pageSize);
```

## Pagination Component Usage

Use the existing `Pagination` component from `@/components/ui/pagination`:

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          if (page > 1) handlePageChange(page - 1);
        }}
        className={page === 1 ? 'pointer-events-none opacity-50' : ''}
      />
    </PaginationItem>
    
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
      <PaginationItem key={pageNum}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handlePageChange(pageNum);
          }}
          isActive={pageNum === page}
        >
          {pageNum}
        </PaginationLink>
      </PaginationItem>
    ))}
    
    <PaginationItem>
      <PaginationNext
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (page < totalPages) handlePageChange(page + 1);
        }}
        className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
      />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

## Accessibility

- Use semantic HTML (`<nav>` with `aria-label="pagination"`)
- Mark current page with `aria-current="page"`
- Provide `aria-label` for Previous/Next buttons
- Ensure keyboard navigation works (Tab, Enter, Space)
- Show total count: "Showing 1-25 of 150 results"

```tsx
<div className="text-sm text-muted-foreground">
  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} results
</div>
```

## Empty States

- Show appropriate message when no results match filters
- Provide option to clear filters
- Don't show pagination controls when there are no results

```tsx
{filteredItems.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-muted-foreground">No results found</p>
    {hasActiveFilters && (
      <Button onClick={handleResetFilters} variant="outline" className="mt-4">
        Clear filters
      </Button>
    )}
  </div>
) : (
  <>
    {/* Paginated content */}
    {/* Pagination controls */}
  </>
)}
```

## Performance Considerations

- Use `useMemo` for filtered/paginated data calculations
- Debounce search input to avoid excessive filtering
- Use `React.memo` for pagination controls if re-rendering is expensive
- Consider virtual scrolling for very long lists

```tsx
const paginatedItems = useMemo(() => {
  const startIndex = (page - 1) * pageSize;
  return filteredItems.slice(startIndex, startIndex + pageSize);
}, [filteredItems, page, pageSize]);
```

## Common Patterns

### Combined Filters + Search + Pagination

```tsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);
const [filters, setFilters] = useState<FilterState>({});
const [searchQuery, setSearchQuery] = useState('');

const filteredItems = useMemo(() => {
  let result = items;
  
  // Apply search
  if (searchQuery.trim()) {
    result = result.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Apply filters
  if (filters.status) {
    result = result.filter(item => item.status === filters.status);
  }
  
  return result;
}, [items, searchQuery, filters]);

const paginatedItems = useMemo(() => {
  const startIndex = (page - 1) * pageSize;
  return filteredItems.slice(startIndex, startIndex + pageSize);
}, [filteredItems, page, pageSize]);

const totalPages = Math.ceil(filteredItems.length / pageSize);

const handleFilterChange = (newFilters: FilterState) => {
  setFilters(newFilters);
  setPage(1);
};

const handleSearchChange = (query: string) => {
  setSearchQuery(query);
  setPage(1);
};

const handlePageSizeChange = (newSize: number) => {
  setPageSize(newSize);
  setPage(1);
};
```
