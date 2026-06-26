import os

project_dir = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach"
excluded_dirs = {".git", ".venv", "node_modules", "dist", "temp_ocr", "uploads"}

print("Files in Leon-Greek-Coach:")
for root, dirs, files in os.walk(project_dir):
    dirs[:] = [d for d in dirs if d not in excluded_dirs and not d.startswith('.')]
    for f in files:
        path = os.path.join(root, f)
        rel_path = os.path.relpath(path, project_dir)
        print(f"  {rel_path} ({os.path.getsize(path)} bytes)")
