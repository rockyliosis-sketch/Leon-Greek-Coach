import subprocess
import re

files = [
    "materials/（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md",
    "materials/（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md",
    "materials/（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md"
]

for f in files:
    print(f"\n==================== Headers for {f} ====================")
    try:
        # Get content of the file from HEAD (before our changes)
        result = subprocess.run(
            ["git", "show", f"HEAD:{f}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        content = result.stdout.decode('utf-8')
        
        # Extract all "## Book Page" headers
        headers = re.findall(r'^## Book Page [^\n]+', content, re.MULTILINE)
        print(f"Total book page headers: {len(headers)}")
        if headers:
            print("First 10 headers:")
            for h in headers[:10]:
                print(f"  {h}")
            print("Last 10 headers:")
            for h in headers[-10:]:
                print(f"  {h}")
    except Exception as e:
        print(f"Error reading file from git: {e}")
