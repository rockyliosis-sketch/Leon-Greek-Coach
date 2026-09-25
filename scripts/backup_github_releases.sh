#!/bin/bash
# 把 GitHub 上所有 Release（版本号、标题、日期、完整说明）备份成本地 Markdown。
# 每次发版后跑一次:  bash scripts/backup_github_releases.sh
set -e
cd "$(dirname "$0")/.."
REPO=rockyliosis-sketch/Leon-Greek-Coach
OUT=docs/GitHub发布记录备份.md
{
  echo "# GitHub 发布记录备份"
  echo
  echo "> 自动生成，请勿手改。来源：https://github.com/$REPO/releases"
  echo "> 生成时间：$(TZ=Europe/Athens date '+%Y-%m-%d %H:%M')（希腊时间）· 重新生成：\`bash scripts/backup_github_releases.sh\`"
  echo
  echo "| 版本 | 标记日期 | 标题 |"
  echo "| --- | --- | --- |"
  gh release list -R $REPO --limit 200 --json tagName,name --jq '.[] | [.tagName, .name] | @tsv' |
  while IFS=$'\t' read -r tag name; do
    d=$(git log -1 --format=%ad --date=short "$tag" 2>/dev/null || echo "")
    echo "| $tag | $d | ${name//|/／} |"
  done
  echo
  gh release list -R $REPO --limit 200 --json tagName --jq '.[].tagName' |
  while read -r tag; do
    echo "---"
    echo
    gh release view "$tag" -R $REPO --json tagName,name,publishedAt,body \
      --jq '"## " + .name + "\n\n- 版本：`" + .tagName + "` · 发布：" + (.publishedAt[:10]) + "\n\n" + (.body | gsub("(?m)^#"; "##"))'
    echo
  done
} > "$OUT"
echo "已写入 ${OUT}（$(wc -l < "${OUT}") 行）"
