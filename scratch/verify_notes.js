// Verify that the generated Markdown files can be parsed successfully by the website logic.
const fs = require('fs');
const path = require('path');

function verifyFile(filePath) {
  console.log(`\nVerifying file: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File does not exist at ${filePath}`);
    return false;
  }

  const rawMD = fs.readFileSync(filePath, 'utf-8');
  const lines = rawMD.split('\n');
  const newWordsList = [];
  let currentId = 1;
  let uploadedUnitDate = null;

  // First scan: find the date in the MD content
  for (let line of lines) {
    const dateMatch = line.match(/(\d{4})[-\/\u5e74](\d{1,2})[-\/\u6708](\d{1,2})\u65e5?/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      uploadedUnitDate = `${year}-${month}-${day}`;
      break; // found the date!
    }
  }

  console.log(`Recognized Date: ${uploadedUnitDate}`);
  if (!uploadedUnitDate) {
    console.error("Error: Could not extract date from the Markdown file.");
    return false;
  }

  lines.forEach(line => {
    // Check if it is a markdown table row (e.g. | 1 | δημόσια | 公共服务 | ...)
    if (line.trim().startsWith('|')) {
      const columns = line.split('|').map(c => c.trim()).filter(c => c !== '');
      // A valid content row must have at least 2 columns (ignoring index and separators)
      if (columns.length >= 2 && !columns[0].includes('---')) {
        let greekPart = '';
        let chinesePart = '';
        let exampleGreek = '';
        let exampleChinese = '';
        
        for (let col of columns) {
          const cleaned = col.replace(/[\*\`]/g, '').trim();
          if (!cleaned || /^\d+$/.test(cleaned) || cleaned === '序号' || cleaned === '校验状态' || cleaned.includes('校验通过') || cleaned.includes('Greek') || cleaned.includes('Chinese')) {
            continue;
          }
          
          const hasGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(cleaned);
          const hasChinese = /[\u4e00-\u9fa5]/.test(cleaned);
          
          if (hasGreek && !hasChinese) {
            if (!greekPart) greekPart = cleaned;
            else if (!exampleGreek) exampleGreek = cleaned;
          } else if (hasChinese) {
            if (!chinesePart) chinesePart = cleaned;
            else if (!exampleChinese) exampleChinese = cleaned;
          }
        }
        
        if (greekPart && chinesePart) {
          newWordsList.push({
            id: currentId++,
            word_greek: greekPart,
            word_chinese: chinesePart,
            example_chinese: exampleChinese,
            note_date: uploadedUnitDate
          });
        }
      }
    }
  });

  console.log(`Parsed ${newWordsList.length} words from table:`);
  newWordsList.forEach(w => {
    console.log(` - ${w.word_greek} -> ${w.word_chinese} (${w.example_chinese || 'no notes'})`);
  });

  return newWordsList.length > 0;
}

const file28 = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/2026-07-28.md";
const file30 = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/希腊语学习笔记/2026-07-30.md";

const success28 = verifyFile(file28);
const success30 = verifyFile(file30);

if (success28 && success30) {
  console.log("\n[SUCCESS] Both markdown files parsed correctly and date information is recognized!");
} else {
  console.error("\n[FAIL] One or both files failed verification.");
  process.exit(1);
}
