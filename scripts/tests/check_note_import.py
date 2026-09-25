"""用后台真代码检查一份笔记 md 粘进「导入笔记」会读出什么。
每次运行都从 AdminDashboard.tsx 现截 handleMDUpload 的解析段, 所以不会过时。
用法: python3 scripts/tests/check_note_import.py materials/notes/2026-09-23.md [更多文件...]"""
import os, subprocess, sys, json, tempfile
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
s = open(os.path.join(R, 'frontend/src/pages/admin/AdminDashboard.tsx'), encoding='utf-8').read()
body = s[s.index('    const lines = rawMD.split'):s.index('    if (newWordsList.length > 0) {')]
def grab(name):
    i = s.index(f'const {name} =')
    first = s[i:].split('\n')[0].rstrip()
    j = s.index('\n};\n', i) + 3 if first.endswith('{') else s.index(';\n', i) + 2
    return s[i:j]
helpers = '\n'.join(grab(n) for n in ('cleanGreekForComparison', 'stripLeadingArticle'))
ts = f'''import fs from 'node:fs';
type Word = any;
const store: Record<string,string> = {{}};
const localStorage = {{ getItem: (k: string) => store[k] ?? null }};
let asked = '';
const window = {{ confirm: (m: string) => {{ asked = m; return true; }} }};
const getGreeceDateString = () => '(今天)';
const NOTE_BOOK_ID = '笔记';
const getNoteUnitFromDate = (_: string) => 0; const getUnitFromDate = (_: string) => 0;
const removeBracketContents = (x: string) => x.replace(/\\([^)]*\\)|（[^）]*）/g, '');
{helpers}
const parse = (rawMD: string) => {{
  store['leon_custom_vocab'] = '[]';
  const targetBookId = NOTE_BOOK_ID; const allVocab: Word[] = [];
  let newWordsList: Word[] = [];
  const run = () => {{
{body}
    const out = newWordsList; return {{ finalNoteDate, out }};
  }};
  return run();
}};
for (const f of {json.dumps(sys.argv[1:])}) {{
  const r: any = parse(fs.readFileSync(f, 'utf8'));
  console.log(`${{f}} → ${{r.out.length}} 个词, 日期 ${{r.finalNoteDate}}${{asked ? ' (没找到日期, 会先问家长)' : ''}}`);
  r.out.forEach((w: any, i: number) => console.log(`  ${{i + 1}}. ${{w.word_greek}} = ${{w.word_chinese}}`));
}}
'''
with tempfile.NamedTemporaryFile('w', suffix='.ts', delete=False, encoding='utf-8') as t:
    t.write(ts)
res = subprocess.run(['node', '--experimental-strip-types', '--no-warnings', t.name], capture_output=True, text=True)
os.unlink(t.name)
print(res.stdout or res.stderr)
