import os

STUDENT_APP_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Projects/Leon-Greek-Coach/frontend/src/pages/student/StudentApp.tsx"

def main():
    if not os.path.exists(STUDENT_APP_PATH):
        print(f"File not found: {STUDENT_APP_PATH}")
        return

    print("Reading StudentApp.tsx...")
    with open(STUDENT_APP_PATH, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    target_dup_header = """      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeModule !== 'dashboard' && (
activeModule !== 'dashboard' && (
              <button onClick={() => setActiveModule('dashboard')} className="btn-back">"""

    replacement_header = """      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeModule !== 'dashboard' && (
            <button onClick={() => setActiveModule('dashboard')} className="btn-back">"""

    if target_dup_header in content:
        content = content.replace(target_dup_header, replacement_header)
        print("-> Removed duplicate navigation header successfully!")
    else:
        # Let's do a slightly more flexible search
        flex_dup = "{activeModule !== 'dashboard' && (\nactiveModule !== 'dashboard' && (\n              <button"
        if flex_dup in content:
            content = content.replace(flex_dup, "{activeModule !== 'dashboard' && (\n            <button")
            print("-> Removed duplicate navigation header successfully (flex)!")
        else:
            print("-> Warning: duplicate navigation header not found!")

    with open(STUDENT_APP_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print("Saved StudentApp.tsx")

if __name__ == "__main__":
    main()
