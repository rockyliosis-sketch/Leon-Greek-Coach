import os

files_to_fix = [
    (
        "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-A.md",
        "* **άλογο** (άλoγο) - 马",
        "* **άλογο** (άλογο) - 马"
    ),
    (
        "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A1-B.md",
        "### 【教学资料】希腊语棋盘游戏：Eπιτραπέζιο παιχνίδι",
        "### 【教学资料】希腊语棋盘游戏：Επιτραπέζιο παιχνίδι"
    ),
    (
        "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/（已压缩）LEON_S GREEK TEXTBOOK A2.md",
        "### 学习建议 (Zητούμενο)",
        "### 学习建议 (Ζητούμενο)"
    )
]

for filepath, target, replacement in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if target in content:
            content = content.replace(target, replacement)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed typo in: {os.path.basename(filepath)}")
        else:
            print(f"Target not found in: {os.path.basename(filepath)}")
    else:
        print(f"File not found: {filepath}")
