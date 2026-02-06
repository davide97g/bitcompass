# Pagination reset when updating filters

Reset pagination to page 1 when filters are updated or cleared to avoid empty or wrong results when the new filter has fewer pages than the current page.

When a page has both **filters** and **pagination**, always reset the page to 1 when:

- A filter value changes (`onFiltersChange`)
- All filters are cleared (`onResetFilters`)

This avoids showing empty or wrong results when the new filter has fewer pages than the current page.

## Example

```tsx
<Filters
  filters={filtersData ?? []}
  values={search}
  onFiltersChange={(key, value) => {
    navigate({
      search: {
        ...search,
        [key]: value === "ALL-ITEMS" ? undefined : value,
        page: 1, // reset to first page
      },
      resetScroll: false,
    });
  }}
  onResetFilters={() => {
    navigate({
      search: {
        ...search,
        program: undefined,
        country: undefined,
        type: undefined,
        year: undefined,
        master: undefined,
        page: 1, // reset to first page
      },
      resetScroll: false,
    });
  }}
/>
```
