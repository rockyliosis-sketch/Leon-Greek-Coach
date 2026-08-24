// Test parser logic similar to handleMDUpload in AdminDashboard.tsx
const fs = require('fs');

function parseMD(rawMD) {
  const lines = rawMD.split('\n');
  const newWordsList = [];
  let currentId = 1;
  const targetBookId = 'A2';
  const currentUnit = 35;
  const finalNoteDate = '2026-07-21';

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
            book_id: targetBookId,
            unit: currentUnit,
            word_greek: greekPart,
            word_chinese: chinesePart,
            pronunciation: 'new',
            example_greek: exampleGreek,
            example_chinese: exampleChinese,
            note_date: finalNoteDate
          });
          return; // Skip standard hyphen parse for this line
        }
      }
    }

    // Robust fallback segment parser for plain text copied/scanned notes
    const hasGreekLine = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(line);
    const hasChineseLine = /[\u4e00-\u9fa5]/.test(line);

    if (hasGreekLine && hasChineseLine) {
      // Split line by 2+ spaces or tabs to handle multi-column rows side-by-side
      const segments = line.split(/\s{2,}|\t/);
      for (const segment of segments) {
        const cleaned = segment.replace(/[\*\`]/g, '').trim();
        if (!cleaned) continue;

        const hasGreekSeg = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(cleaned);
        const hasChineseSeg = /[\u4e00-\u9fa5]/.test(cleaned);

        if (hasGreekSeg && hasChineseSeg) {
          // Find first index of Chinese character to split Greek and Chinese parts
          const firstChineseIdx = cleaned.search(/[\u4e00-\u9fa5]/);
          if (firstChineseIdx > 0) {
            let gr = cleaned.slice(0, firstChineseIdx).trim();
            const zh = cleaned.slice(firstChineseIdx).trim();
            
            // Clean index numbers or trailing punctuation in Greek part (e.g. "1. ληξιαρχείο:", "2. ")
            gr = gr.replace(/^\d+[\.\s、]+/, '').replace(/[-—–:~：\s\/\\→>]+$/, '').trim();

            if (gr && zh) {
              newWordsList.push({
                id: currentId++,
                book_id: targetBookId,
                unit: currentUnit,
                word_greek: gr,
                word_chinese: zh,
                pronunciation: 'new',
                example_greek: '',
                example_chinese: '',
                note_date: finalNoteDate
              });
            }
          }
        }
      }
    }
  });

  return newWordsList;
}

// Test cases
const testMD = `
# 希腊语学习笔记 - 2026年7月21日

*   **日期**: 2026-07-21

| 序号 | 希腊语 (Greek) | 中文翻译 (Chinese) | 语法与发音备注 | 校验状态 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **βαμβάκι** | 棉花 / 棉球 | 中性名词 | [√] 校验通过 |

单行无连字符:
ληξιαρχείο 注册处
τροχαία: 交警
μολύβι, το - 铅笔

多列并排:
επικίνδυνος 危险的  κλειδώνω 锁上
δηλητηριάζω 使中毒    δηλητήριο 毒物
`;

console.log("Parsing test input...");
const result = parseMD(testMD);
console.log(`Parsed ${result.length} words:`);
console.log(JSON.stringify(result, null, 2));

// Assertions
const expectedGreek = ["βαμβάκι", "ληξιαρχείο", "τροχαία", "μολύβι, το", "επικίνδυνος", "κλειδώνω", "δηλητηριάζω", "δηλητήριο"];
const expectedChinese = ["棉花 / 棉球", "注册处", "交警", "铅笔", "危险的", "锁上", "使中毒", "毒物"];

let success = true;
if (result.length !== expectedGreek.length) {
  console.error(`FAIL: Expected ${expectedGreek.length} words, but parsed ${result.length}`);
  success = false;
} else {
  for (let i = 0; i < result.length; i++) {
    if (result[i].word_greek !== expectedGreek[i]) {
      console.error(`FAIL at index ${i}: Expected Greek '${expectedGreek[i]}', got '${result[i].word_greek}'`);
      success = false;
    }
    if (result[i].word_chinese !== expectedChinese[i]) {
      console.error(`FAIL at index ${i}: Expected Chinese '${expectedChinese[i]}', got '${result[i].word_chinese}'`);
      success = false;
    }
  }
}

if (success) {
  console.log("SUCCESS! All parser assertions passed.");
} else {
  process.exit(1);
}
