from pathlib import Path

page_path = Path(r"frontend/src/app/page.js")
block_path = Path(r"tools/dashboard_block.txt")

page = page_path.read_text(encoding="utf-8")
new_block = block_path.read_text(encoding="utf-8").rstrip() + "\n"

start_marker = "{activeTab === 'dashboard' && ("
end_marker = "/* THE NEW ADVANCED MULTI-CROP TAB */"

start_idx = page.find(start_marker)
if start_idx == -1:
    raise SystemExit("Dashboard block start not found")
start_line = page.rfind("\n", 0, start_idx) + 1

end_idx = page.find(end_marker)
if end_idx == -1:
    raise SystemExit("Lifecycle marker not found")
end_line = page.rfind("\n", 0, end_idx) + 1

updated = page[:start_line] + new_block + page[end_line:]
page_path.write_text(updated, encoding="utf-8")
