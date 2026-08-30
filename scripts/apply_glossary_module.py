import os
import re

file_path = "Projects/Leon-Greek-Coach/frontend/src/pages/student/StudentApp.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update activeModule state type
old_active = "const [activeModule, setActiveModule] = useState<'dashboard' | 'matching' | 'spelling' | 'quiz' | 'truefalse' | 'translation_gr_zh' | 'translation_zh_gr' | 'writing_speaking'>('dashboard');"
new_active = """const [activeModule, setActiveModule] = useState<'dashboard' | 'matching' | 'spelling' | 'quiz' | 'truefalse' | 'translation_gr_zh' | 'translation_zh_gr' | 'writing_speaking' | 'glossary_review'>('dashboard');
  
  // Glossary Review States (单词表每日必做复习)
  const [glossaryIndex, setGlossaryIndex] = useState(0);
  const [userGlossaryInput, setUserGlossaryInput] = useState('');
  const [glossaryChecked, setGlossaryChecked] = useState(false);
  const [isCorrectGlossaryInput, setIsCorrectGlossaryInput] = useState(false);
  const [glossaryScore, setGlossaryScore] = useState(0);
  const [glossaryMistakes, setGlossaryMistakes] = useState(0);
  const [glossaryWrongAttempt, setGlossaryWrongAttempt] = useState(false);
  const [showGlossaryTip, setShowGlossaryTip] = useState(false);"""

assert old_active in code, "Failed to match activeModule"
code = code.replace(old_active, new_active, 1)

# 2. Add glossaryReviewPool after translationZhGrPool
pool_target = "const handleReportFeedback = async (questionId: any, greek: string, expected: string, userTyped: string) => {"
glossary_pool_code = """  // Glossary Review Pool (针对 A1/A2 词汇表知识库的每日必做特训池)
  const glossaryReviewPool = useMemo(() => {
    const allMaster: any[] = (staticVocabData as any).master_glossary || [];
    if (allMaster.length === 0) return [];

    const scheduledToday = allMaster.filter((w: any) => w.scheduled_date === selectedDateStr);
    
    // Ebbinghaus review intervals: 1, 2, 4, 7, 15, 30 days prior
    const ebbinghausReviews: any[] = [];
    const intervals = [1, 2, 4, 7, 15, 30];
    const parts = selectedDateStr.split('-');
    if (parts.length === 3) {
      const selD = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      intervals.forEach(inv => {
        const prevD = new Date(selD);
        prevD.setDate(prevD.getDate() - inv);
        const prevStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}-${String(prevD.getDate()).padStart(2, '0')}`;
        const prevWords = allMaster.filter((w: any) => w.scheduled_date === prevStr);
        ebbinghausReviews.push(...prevWords);
      });
    }

    let pool = [...scheduledToday, ...ebbinghausReviews];

    if (pool.length < 20) {
      const fallbackWords = allMaster.filter((w: any) => w.status === 'mastered' || (w.day_assigned && w.day_assigned <= 5));
      const seed = selectedDateStr.split('-').reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
      const shuffled = [...fallbackWords].sort((a: any, b: any) => ((a.id * 31 + seed) % 97) - ((b.id * 31 + seed) % 97));
      pool = [...pool, ...shuffled];
    }

    const seen = new Set<number>();
    const uniquePool: any[] = [];
    for (const item of pool) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniquePool.push(item);
        if (uniquePool.length >= 20) break;
      }
    }

    return uniquePool;
  }, [selectedDateStr]);

  const currentGlossaryWord = glossaryReviewPool[glossaryIndex] || null;

  """

assert pool_target in code, "Failed to match pool_target"
code = code.replace(pool_target, glossary_pool_code + pool_target, 1)

# 3. Add glossary check and next handlers
handlers_target = "  // Switch Module handler\n  const startModule = (module: 'matching' | 'spelling' | 'quiz' | 'truefalse' | 'translation_gr_zh' | 'translation_zh_gr') => {"
new_handlers = """  const checkGlossaryAnswer = (userRaw: string, wordObj: any): boolean => {
    if (!userRaw || !wordObj) return false;
    const wordGreek = wordObj.word_greek || '';
    const userClean = cleanGreekForComparison(userRaw);
    const targetClean = cleanGreekForComparison(wordGreek);
    if (userClean === targetClean && userClean.length > 0) return true;

    const noBrackets = wordGreek.replace(/\\(.*?\\)|\\[.*?\\]/g, '').trim();
    const commaParts = noBrackets.split(',').map((p: string) => p.trim()).filter(Boolean);
    for (const part of commaParts) {
      const partClean = cleanGreekForComparison(part);
      if (userClean === partClean && partClean.length > 0) return true;
    }

    const slashParts = wordGreek.split('/').map((p: string) => p.trim()).filter(Boolean);
    for (const sp of slashParts) {
      const spClean = cleanGreekForComparison(sp);
      if (userClean === spClean && spClean.length > 0) return true;
    }
    return false;
  };

  const handleCheckGlossary = () => {
    if (!currentGlossaryWord) return;
    const correct = checkGlossaryAnswer(userGlossaryInput, currentGlossaryWord);
    if (correct) {
      setGlossaryChecked(true);
      setIsCorrectGlossaryInput(true);
      setGlossaryScore(prev => prev + 5);
      setGlossaryWrongAttempt(false);
    } else {
      setGlossaryWrongAttempt(true);
      setGlossaryMistakes(prev => {
        const next = prev + 1;
        if (next >= 2) setShowGlossaryTip(true);
        return next;
      });
    }
  };

  const handleNextGlossary = () => {
    if (glossaryIndex < glossaryReviewPool.length - 1) {
      setGlossaryIndex(prev => prev + 1);
      setUserGlossaryInput('');
      setGlossaryChecked(false);
      setGlossaryWrongAttempt(false);
      setGlossaryMistakes(0);
      setShowGlossaryTip(false);
    } else {
      handleGameComplete(glossaryScore);
    }
  };

  // Switch Module handler
  const startModule = (module: 'matching' | 'spelling' | 'quiz' | 'truefalse' | 'translation_gr_zh' | 'translation_zh_gr' | 'glossary_review') => {"""

assert handlers_target in code, "Failed to match handlers_target"
code = code.replace(handlers_target, new_handlers, 1)

# 4. Update startModule reset conditions
start_module_end = """    else if (module === 'translation_zh_gr') {
      setTransZhGrIndex(0);
      setUserTransGrZhInput('');
      setTransZhGrChecked(false);
      setTransZhGrScore(0);
      setTransZhGrMistakes(0);
    }"""
new_start_module_end = """    else if (module === 'translation_zh_gr') {
      setTransZhGrIndex(0);
      setUserTransGrZhInput('');
      setTransZhGrChecked(false);
      setTransZhGrScore(0);
      setTransZhGrMistakes(0);
    }
    else if (module === 'glossary_review') {
      setGlossaryIndex(0);
      setUserGlossaryInput('');
      setGlossaryChecked(false);
      setGlossaryScore(0);
      setGlossaryMistakes(0);
      setGlossaryWrongAttempt(false);
      setShowGlossaryTip(false);
    }"""

assert start_module_end in code, "Failed to match start_module_end"
code = code.replace(start_module_end, new_start_module_end, 1)

# 5. Update handleGameComplete coreModules
old_core = "const coreModules = ['matching', 'spelling', 'quiz', 'truefalse', 'translation_gr_zh', 'translation_zh_gr'];"
new_core = "const coreModules = ['matching', 'spelling', 'quiz', 'truefalse', 'translation_gr_zh', 'translation_zh_gr', 'glossary_review'];"

assert old_core in code, "Failed to match old_core"
code = code.replace(old_core, new_core, 1)

old_text_count = "pointsEarnedText = `\\n今日已完成模块: ${updated.filter((m: string) => coreModules.includes(m)).length} / 6\\n全部做完每天可积 10 分！\\n当前总积分: ${score} XP`;"
new_text_count = "pointsEarnedText = `\\n今日已完成模块: ${updated.filter((m: string) => coreModules.includes(m)).length} / 7\\n全部做完每天可积 10 分！\\n当前总积分: ${score} XP`;"
if old_text_count in code:
    code = code.replace(old_text_count, new_text_count, 1)

# 6. Add Dashboard Card after writing_speaking card
ws_card_end = """              <button 
                onClick={() => {
                  setActiveModule('writing_speaking');
                  setCurrentChallengeIndex(0);
                  setUserWritingInput('');
                  setShowChallengeTip(false);
                }} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>"""

new_dashboard_card = """              <button 
                onClick={() => {
                  setActiveModule('writing_speaking');
                  setCurrentChallengeIndex(0);
                  setUserWritingInput('');
                  setShowChallengeTip(false);
                }} 
                className="btn-premium btn-blue-filled"
              >
                开始 <ChevronRight size={16} />
              </button>
            </div>

            {/* 8. Glossary Knowledge Base Daily Review (单词表每日必做复习) */}
            <div className="game-card border-purple" style={{ position: 'relative', paddingRight: '90px' }}>
              {completedModulesForDate.includes('glossary_review') && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#34C759',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(52,199,89,0.3)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  zIndex: 3
                }} title="今日已完成">
                  ✓
                </div>
              )}
              <img 
                src="/athena.png" 
                alt="Athena" 
                className="game-character-img"
              />
              <h3 className="game-title" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                单词表每日复习
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  background: '#9333EA',
                  color: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>每日必做</span>
              </h3>
              <div style={{ fontSize: '11px', color: '#9333EA', fontWeight: 700, marginBottom: '8px' }}>
                ΕΠΑΝΑΛΗΨΗ ΛΕΞΙΛΟΓΙΟΥ (A1 & A2)
              </div>
              <p className="game-description" style={{ marginBottom: '16px' }}>
                专属 A1/A2 单词表知识库每日复习。中译希填空，涵盖当日新学词与艾宾浩斯抗遗忘记忆曲线到期词。
                <span style={{ display: 'block', fontSize: '12px', color: '#86868B', marginTop: '4px' }}>
                  Ημερήσια επανάληψη λεξιλογίου από τη βάση γνώσεων με καμπύλη λήθης.
                </span>
              </p>
              <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '16px', fontWeight: 650 }}>
                题量：20 道词汇填空题 (智能记忆排期)
              </div>
              <button 
                onClick={() => startModule('glossary_review')} 
                className="btn-premium btn-blue-filled"
                style={{ background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)', borderColor: '#7E22CE' }}
              >
                开始复习 <ChevronRight size={16} />
              </button>
            </div>"""

assert ws_card_end in code, "Failed to match ws_card_end"
code = code.replace(ws_card_end, new_dashboard_card, 1)

# 7. Add Glossary Question Screen View after writing_speaking view
main_end_target = "          </div>\n        )}\n      </main>"
glossary_view_code = """          </div>
        )}

        {/* 8. Daily Glossary Vocabulary Review Question Screen (单词表每日复习填空) */}
        {activeModule === 'glossary_review' && currentGlossaryWord && (
          <div className="game-module animate-fade-in" style={{ maxWidth: '680px', width: '100%' }}>
            <h2 className="module-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>单词表每日复习</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>知识库特训</span>
              </span>
              <span style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>当前进度: {glossaryIndex + 1} / {glossaryReviewPool.length}</span>
            </h2>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#86868B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '24px', marginRight: '4px' }}>
              Πρόοδος Λεξιλογίου: {glossaryIndex + 1} / {glossaryReviewPool.length}
            </div>

            <div className="game-container-card" style={{ padding: '32px' }}>
              {/* Word Header with Badges */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ 
                    fontSize: '11.5px', 
                    fontWeight: 750, 
                    background: 'rgba(147,51,234,0.1)', 
                    color: '#9333EA',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}>
                    {currentGlossaryWord.level || 'A1'} 词汇 · {currentGlossaryWord.letter || '核心词'}
                  </span>
                  {currentGlossaryWord.tag && (
                    <span style={{ 
                      fontSize: '11.5px', 
                      fontWeight: 750, 
                      background: 'rgba(0,113,227,0.1)', 
                      color: '#0071E3',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      [{currentGlossaryWord.tag}] {
                        currentGlossaryWord.tag === '中' ? '中性名词' :
                        currentGlossaryWord.tag === '阳' ? '阳性名词' :
                        currentGlossaryWord.tag === '阴' ? '阴性名词' :
                        currentGlossaryWord.tag === '动' ? '动词' :
                        currentGlossaryWord.tag === '形' ? '形容词' :
                        currentGlossaryWord.tag === '副' ? '副词' :
                        currentGlossaryWord.tag === '复' ? '复数名词' : '词汇'
                      }
                    </span>
                  )}
                  {currentGlossaryWord.status === 'upcoming' && (
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      background: 'rgba(52,199,89,0.12)', 
                      color: '#16A34A',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      ✨ 当日新词
                    </span>
                  )}
                </div>
                
                <h3 style={{ 
                  fontSize: '32px', 
                  fontWeight: 850, 
                  color: '#1D1D1F', 
                  margin: '12px 0 6px 0',
                  letterSpacing: '-0.5px'
                }}>
                  {currentGlossaryWord.word_chinese}
                </h3>
                {currentGlossaryWord.word_english && (
                  <div style={{ fontSize: '15px', color: '#86868B', fontWeight: 600 }}>
                    ({currentGlossaryWord.word_english})
                  </div>
                )}
              </div>

              {/* Input Group */}
              <div className="admin-input-group" style={{ marginBottom: '24px' }}>
                <label className="admin-label" style={{ fontWeight: 700, fontSize: '13.5px', color: '#1D1D1F', marginBottom: '8px', display: 'block' }}>
                  请输入对应的希腊语单词 / Πληκτρολογήστε την ελληνική λέξη:
                </label>
                <input
                  type="text"
                  placeholder="在此输入希腊语单词拼写..."
                  value={userGlossaryInput}
                  onChange={e => setUserGlossaryInput(e.target.value)}
                  className="admin-input"
                  disabled={glossaryChecked}
                  autoFocus
                  style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 650, borderRadius: '14px' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && userGlossaryInput.trim()) {
                      if (!glossaryChecked) {
                        handleCheckGlossary();
                      } else {
                        handleNextGlossary();
                      }
                    }
                  }}
                />

                {/* Quick Greek Special Characters Keyboard */}
                {!glossaryChecked && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#86868B', fontWeight: 600 }}>重音辅助键:</span>
                    {['ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', 'ΐ', 'ΰ', 'ς'].map(char => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => setUserGlossaryInput(prev => prev + char)}
                        style={{
                          background: '#F5F5F7',
                          border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1D1D1F',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Answer & Feedback box */}
              {glossaryChecked && (
                <div style={{ 
                  background: isCorrectGlossaryInput ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
                  color: isCorrectGlossaryInput ? '#34C759' : '#FF3B30',
                  padding: '20px',
                  borderRadius: '14px',
                  marginBottom: '24px',
                  fontWeight: 'bold',
                  border: isCorrectGlossaryInput ? '1.5px solid rgba(52,199,89,0.25)' : '1.5px solid rgba(255,59,48,0.25)'
                }}>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                    {isCorrectGlossaryInput ? '🎉 回答正确！+5 XP' : '❌ 拼写有误，请注意标准写法'}
                  </p>
                  <p style={{ fontSize: '11px', textTransform: 'uppercase', margin: '3px 0 8px 0', opacity: 0.9 }}>
                    {isCorrectGlossaryInput ? 'ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ!' : 'ΛΑΘΟΣ ΑΠΑΝΤΗΣΗ'}
                  </p>
                  <div style={{ color: '#1D1D1F', fontSize: '17px', marginTop: '8px', fontWeight: 750, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>标准词条 / Σωστή Λέξη: <strong style={{ color: '#0071E3' }}>{currentGlossaryWord.word_greek}</strong></span>
                    <button 
                      onClick={() => speakGreek(currentGlossaryWord.word_greek)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0071E3', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
                      title="播放读音"
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Wrong Attempt Prompt */}
              {!glossaryChecked && glossaryWrongAttempt && (
                <div style={{ 
                  background: '#FFF2E8', 
                  border: '1px solid #FFD591', 
                  color: '#D4380D',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '13.5px',
                  fontWeight: 650
                }}>
                  ⚠️ 拼写未完全匹配，请检查重音或词形并重试！(还可以点击下方辅助键补全)
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                {!glossaryChecked ? (
                  <button
                    onClick={handleCheckGlossary}
                    disabled={!userGlossaryInput.trim()}
                    className="btn-premium btn-blue-filled"
                    style={{ 
                      background: userGlossaryInput.trim() ? 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)' : '#E5E5EA',
                      borderColor: userGlossaryInput.trim() ? '#7E22CE' : '#E5E5EA',
                      padding: '12px 28px',
                      fontSize: '15px'
                    }}
                  >
                    检查答案 / Έλεγχος
                  </button>
                ) : (
                  <button
                    onClick={handleNextGlossary}
                    className="btn-premium btn-blue-filled"
                    style={{ 
                      background: 'linear-gradient(135deg, #0071E3 0%, #0056B3 100%)',
                      padding: '12px 28px',
                      fontSize: '15px'
                    }}
                  >
                    {glossaryIndex === glossaryReviewPool.length - 1 ? '收集积分 / 完成特训' : '下一题 / Επόμενο'}
                  </button>
                )}
              </div>

              {/* Tip Box */}
              {showGlossaryTip && !glossaryChecked && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#F5F5F7', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px' }}>
                  <h5 style={{ margin: '0 0 6px 0', color: '#9333EA', fontWeight: 'bold', fontSize: '13px' }}>💡 词汇提示 / Συμβουλή:</h5>
                  <div style={{ fontSize: '13px', color: '#1D1D1F' }}>
                    首字母提示：<strong>{currentGlossaryWord.word_greek[0]}</strong> ...，总长度约 {currentGlossaryWord.word_greek.replace(/,.*$/, '').length} 个字母。
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>"""

assert main_end_target in code, "Failed to match main_end_target"
code = code.replace(main_end_target, glossary_view_code, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully applied glossary_review module to StudentApp.tsx!")
