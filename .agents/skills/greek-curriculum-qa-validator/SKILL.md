---
name: greek-curriculum-qa-validator
description: Universal Pre-Flight QA & Bidirectional Insurance System for Leon Greek Coach. Verifies textbook vocabulary, 4-type grammar/dialogue drills (choice, cloze, qa, translate), exam questions, option shuffling randomness, and bidirectional semantic alignment before deployment.
---

# Greek Curriculum QA Validator & Bidirectional Insurance Engine

This skill defines the mandatory pre-flight verification protocols, mathematical constraints, and bidirectional semantic alignment checks for all educational content in the **Leon Greek Coach** curriculum.

Whenever you generate new vocabulary, grammar drills, dialogue questions, or exam items for the platform, you **MUST** follow this verification protocol before publishing or committing data.

---

## 1. Core Verification Principles (核心检验原则)

1. **Bidirectional Verification Loop (双向闭环检验)**:
   - **Check Answer by Question**: Substitute the answer into the question prompt/blank; verify that the reconstructed sentence is 100% grammatically and culturally natural in Greek.
   - **Check Question by Answer**: Read the answer in isolation and verify that it strictly and exclusively answers the question prompt without ambiguity.
2. **Zero Pattern Predictability (选项绝对随机打乱)**:
   - For all 4-choice questions (`choice`), the correct answer position **MUST NEVER** be statically fixed (e.g. index 0).
   - The distribution across options 0, 1, 2, and 3 must be balanced and randomized.
3. **No Double-Correct Distractors (严禁双重正确干扰项)**:
   - Verify that no distractor is another valid inflection or synonymous phrasing of the target answer (e.g. `Πονάνε` vs `Πονούν`, `μη` vs `μην`).
4. **Accent & Spelling Tolerance Matrix (重音与正字法容错)**:
   - All text inputs (`cloze`, `qa`, `translate`) must supply `acceptable_answers` containing tone-neutral equivalents, alternative valid pronoun word orders, and standard punctuation variations.

---

## 2. Question Type Rules (四大题型规范)

### 📝 1. Choice Questions (`choice`)
- **Options Count**: Exactly 4 unique choices.
- **Answer Inclusion**: `answer in options`.
- **Randomization**: Answer index must be scattered across positions `[0, 1, 2, 3]`.
- **Distractors**: Must be grammatically realistic but clearly distinct under the context.

### ✏️ 2. Cloze Questions (`cloze`)
- **Placeholder**: Prompt must contain `______` representing the blank.
- **Answer**: The target word or conjugated verb / declined noun.
- **Acceptable Answers**: Must include standard unaccented / variant spellings (e.g. `["είμαι", "ειμαι"]`).
- **Reconstruction Test**: Replacing `______` with `answer` produces a valid Greek sentence.

### 💬 3. Communicative QA (`qa`)
- **Prompt**: Conversational prompt with Speaker A asking a question or setting a real-life situation.
- **Answer**: Natural, culturally authentic response.
- **Options**: Either 3-4 response options, or open response with comprehensive `acceptable_answers`.

### 🌐 4. Sentence Translation (`translate`)
- **Prompt**: Source sentence (Chinese or Greek).
- **Answer**: Target translation.
- **Acceptable Answers**: Must account for optional subject pronouns (e.g. `Εγώ είμαι...` vs `Είμαι...`), and word order variations.

---

## 3. Automated Pre-Flight Execution Command

Run the unified QA verifier script in the workspace root before any build or commit:

```bash
python3 scripts/curriculum_qa_verifier.py
```

If the script returns exit code `0` (`ALL GATES PASSED`), the content is certified safe for student practice. If any error is reported, fix the offending data items immediately.
