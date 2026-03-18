Help me share something to BitCompass.

## Steps

1. **Determine what I'm sharing.** Ask me what kind of content this is:
   - **Rule**: Behaviors, documentation, or how-to for the AI (e.g. i18n guide, coding standards)
   - **Solution**: How we fixed or implemented a specific problem
   - **Skill**: How the AI should behave in a domain (e.g. front-end design, back-end implementation)
   - **Command**: A workflow or command (e.g. release checklist)

2. **Check for duplicates.** Use the `search-rules` MCP tool to search for similar content. If something similar exists, ask me whether I want to update the existing item or create a new one.

3. **Collect content.** Ask me one question at a time:
   - Title (required)
   - Description — a short summary (required)
   - Body — the full content (required). If I point to a file, read it.
   - Context (optional) — additional context
   - Examples (optional) — example usage
   - Technologies (optional) — relevant tech tags

4. **Publish.** Call the `post-rules` MCP tool with the chosen kind and collected fields.

5. **Pull to project.** After publishing, offer to install it locally using `pull-rule` so it's available in this project.
