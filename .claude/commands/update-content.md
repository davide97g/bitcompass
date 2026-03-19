---
id: 3dae4755-68b0-453b-9516-4fd9c3b9a631
version: "1.0.0"
---
Help me update an existing item in BitCompass.

## Steps

1. **Find the item.** Ask me what I want to update — a keyword or specific ID.
   - If I give a keyword, use `search-rules` to find matches. Present results and ask which one.
   - If I give an ID, use `get-rule` to fetch it directly.

2. **Show current content.** Display the current title, description, body, and other fields so I can see what's there.

3. **Collect changes.** Ask me which fields I want to change. Accept changes one field at a time.

4. **Apply update.** Call the `update-rule` MCP tool with the ID and changed fields.

5. **Re-pull.** After updating, offer to re-pull the item into the project using `pull-rule` so local files stay current.
