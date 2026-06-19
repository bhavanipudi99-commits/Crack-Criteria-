import React, { useState } from 'react';

export default function ReviewScreen(props) {
  const {
    gameCanvasQueue, sessionAuditLog, criteriaTables, score,
    difficulty, isPreviewMode, setScreen, setScore, setIsPreviewMode,
    activeGameMode, parseNumericalData, activeChapterTables
  } = props;

  const [numTab, setNumTab] = useState('all'); // 'all' | 'played'

  // ── Collect all tile IDs that were involved in the game ──────────────────
  const allSelectedIds = new Set();
  (gameCanvasQueue || []).forEach(c => {
    if (!c.questions) return;
    c.questions.forEach(q => {
      if (q.selectedTileIds) q.selectedTileIds.forEach(id => allSelectedIds.add(id));
      if (q.targetTileId) allSelectedIds.add(q.targetTileId);
      if (q.decoyTileIds) q.decoyTileIds.forEach(id => allSelectedIds.add(id));
      if (q.correctTileIds) q.correctTileIds.forEach(id => allSelectedIds.add(id));
      if (q.distractorTileId) allSelectedIds.add(q.distractorTileId);
    });
  });
  (sessionAuditLog || []).forEach(log => { if (log.tileId) allSelectedIds.add(log.tileId); });

  // ── Tables involved ───────────────────────────────────────────────────────
  const allTables = (criteriaTables || []);
  const tablesToReview = allTables.filter(table =>
    (table.rows || []).some(row =>
      !row.isHeading && (row.cells || []).some(c =>
        (c.tiles || []).some(t => allSelectedIds.has(t.id))
      )
    )
  );

  const criteriaInCanvas = tablesToReview.flatMap(table =>
    (table.rows || []).map(row => {
      if (row.isHeading) return { row, isHeading: true, tableName: table.name };
      const isSelectedInGame = (row.cells || []).some(c =>
        (c.tiles || []).flatMap(t => [t, ...(t.subtiles || [])]).some(t => allSelectedIds.has(t.id))
      );
      if (!isSelectedInGame) return null;

      const cellResults = (row.cells || []).map(cell => {
        const tileResults = (cell.tiles || [])
          .flatMap(t => [t, ...(t.subtiles || [])])
          .filter(tile => allSelectedIds.has(tile.id))
          .map(tile => {
            const entries = (sessionAuditLog || []).filter(e => e.tileId === tile.id);
            const isOnlyPresented = entries.length > 0 && entries.every(e => e.presentedOnly);
            return {
              tile,
              solved: entries.some(e => e.solved && !e.skipped),
              attempted: entries.some(e => !e.presentedOnly),
              skipped: entries.some(e => e.skipped),
              presentedOnly: isOnlyPresented
            };
          });
        const allSolved = tileResults.length > 0 && tileResults.every(r => r.solved || r.presentedOnly);
        return { ...cell, tileResults, allSolved };
      });

      const allActiveCells = cellResults.filter(c => c.tileResults.length > 0);
      const allSolved = allActiveCells.length > 0 && allActiveCells.every(c => c.allSolved);
      return { row, isHeading: false, cellResults, allSolved, tableName: table.name };
    }).filter(Boolean)
  );

  const solvedCount = criteriaInCanvas.filter(c => !c.isHeading && c.allSolved).length;
  const totalPlayable = criteriaInCanvas.filter(c => !c.isHeading).length;

  // ── Numerical Tile Data ───────────────────────────────────────────────────
  const isNumericalGame = activeGameMode === 'NUMERICAL' || activeGameMode === 'MIXED_MARATHON';
  const chapterTables = (activeChapterTables && activeChapterTables.length > 0)
    ? activeChapterTables
    : allTables;

  // Build structured list of ALL numerical tiles from chapter tables
  const numericalGroups = [];
  (chapterTables || []).forEach(table => {
    const tableGroup = { tableName: table.name, headings: [] };
    let currentHeading = { headingText: null, rows: [] };

    (table.rows || []).forEach(row => {
      if (row.isHeading) {
        if (currentHeading.rows.length > 0 || currentHeading.headingText) {
          tableGroup.headings.push(currentHeading);
        }
        currentHeading = {
          headingText: (row.cells || []).map(c => c.text).filter(Boolean).join(' / ') || null,
          rows: []
        };
        return;
      }
      // Non-heading row: collect all numerical tiles from all cells
      const numTilesInRow = [];
      (row.cells || []).forEach(cell => {
        (cell.tiles || []).forEach(tile => {
          const allItems = [tile, ...(tile.subtiles || [])];
          allItems.forEach(item => {
            const parsed = parseNumericalData && parseNumericalData(item.label);
            if (parsed) {
              numTilesInRow.push({
                id: item.id,
                label: item.label,
                criterionText: cell.text || '',
                parsed,
                wasPlayed: allSelectedIds.has(item.id),
                wasSolved: (sessionAuditLog || []).some(e => e.tileId === item.id && e.solved),
                wasSkipped: (sessionAuditLog || []).some(e => e.tileId === item.id && e.skipped),
              });
            }
          });
        });
      });
      if (numTilesInRow.length > 0) {
        currentHeading.rows.push({ rowId: row.id, tiles: numTilesInRow });
      }
    });

    if (currentHeading.rows.length > 0 || currentHeading.headingText) {
      tableGroup.headings.push(currentHeading);
    }

    const totalNumTiles = tableGroup.headings.reduce((s, h) => s + h.rows.reduce((sr, r) => sr + r.tiles.length, 0), 0);
    if (totalNumTiles > 0) numericalGroups.push(tableGroup);
  });

  const totalNumericalTiles = numericalGroups.reduce((s, g) =>
    s + g.headings.reduce((sh, h) => sh + h.rows.reduce((sr, r) => sr + r.tiles.length, 0), 0), 0
  );
  const playedNumericalTiles = numericalGroups.reduce((s, g) =>
    s + g.headings.reduce((sh, h) => sh + h.rows.reduce((sr, r) => sr + r.tiles.filter(t => t.wasPlayed).length, 0), 0), 0
  );

  return (
    <div className="flex flex-col justify-between h-full bg-slate-50">
      <div className="overflow-y-auto flex-1 p-4 space-y-4 pb-2">

        {/* Header */}
        <div className="border-b border-slate-200 pb-3">
          <span className="text-[10px] font-extrabold text-clinical-green uppercase tracking-widest bg-emerald-100 px-2.5 py-0.5 rounded-full">Complete</span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">
            {isNumericalGame && activeGameMode !== 'MIXED_MARATHON' ? 'Numerical Review' : 'Criteria Review'}
          </h2>
          <p className="text-[11px] text-slate-500">Includes tiles across all questions played.</p>
        </div>

        {/* Score Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isNumericalGame && activeGameMode !== 'MIXED_MARATHON' ? 'Questions Answered' : 'Criteria Solved'}
          </p>
          {isNumericalGame && activeGameMode !== 'MIXED_MARATHON' ? (
            <p className="text-4xl font-black text-amber-500 mt-1">{score.correct}<span className="text-xl text-slate-400"> correct</span></p>
          ) : (
            <p className="text-4xl font-black text-clinical-blue mt-1">{solvedCount}<span className="text-xl text-slate-400"> / {totalPlayable}</span></p>
          )}
          <div className="flex justify-center gap-4 mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-bold">
            <span>✓ {score.correct} correct</span>
            <span className="text-slate-300">|</span>
            <span>✗ {score.wrong} wrong</span>
            <span className="text-slate-300">|</span>
            <span className="text-indigo-600">Points: {((score.correct * (difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1.0)) - (score.wrong * 0.33)).toFixed(1)}</span>
          </div>
        </div>

        {/* ── NUMERICAL TILE REVEAL PANEL ─────────────────────────────────── */}
        {isNumericalGame && totalNumericalTiles > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">🔢 Numerical Tiles</p>
                <p className="text-sm font-black text-slate-800">Chapter Numerical Reference</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {playedNumericalTiles} played · {totalNumericalTiles} total in chapter
                </p>
              </div>
              {/* Tab toggle */}
              <div className="flex gap-1 bg-amber-100 p-1 rounded-lg">
                <button onClick={() => setNumTab('all')}
                  className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md transition-all ${numTab === 'all' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-500 hover:text-amber-700'}`}>
                  All ({totalNumericalTiles})
                </button>
                <button onClick={() => setNumTab('played')}
                  className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md transition-all ${numTab === 'played' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-500 hover:text-amber-700'}`}>
                  Played ({playedNumericalTiles})
                </button>
              </div>
            </div>

            {/* Tile groups */}
            <div className="divide-y divide-amber-100">
              {numericalGroups.map((group, gi) => {
                const filteredHeadings = group.headings.map(h => ({
                  ...h,
                  rows: h.rows.map(r => ({
                    ...r,
                    tiles: numTab === 'played' ? r.tiles.filter(t => t.wasPlayed) : r.tiles
                  })).filter(r => r.tiles.length > 0)
                })).filter(h => h.rows.length > 0);

                if (filteredHeadings.length === 0) return null;

                return (
                  <div key={gi}>
                    {/* Table name header */}
                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">📋 {group.tableName}</p>
                    </div>

                    {filteredHeadings.map((heading, hi) => (
                      <div key={hi}>
                        {/* Section heading */}
                        {heading.headingText && (
                          <div className="px-4 py-1.5 bg-amber-50/60 border-b border-amber-100">
                            <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{heading.headingText}</p>
                          </div>
                        )}
                        {/* Tile rows */}
                        {heading.rows.map((row, ri) => (
                          <div key={ri} className="px-4 py-2 border-b border-slate-100 last:border-0">
                            <div className="flex flex-col gap-1.5">
                              {row.tiles.map(tile => {
                                const statusIcon = tile.wasSolved ? '✓' : tile.wasSkipped ? '⚠' : tile.wasPlayed ? '✗' : null;
                                const statusColor = tile.wasSolved ? 'text-emerald-600' : tile.wasSkipped ? 'text-amber-600' : tile.wasPlayed ? 'text-rose-500' : '';
                                const bgColor = tile.wasSolved ? 'bg-emerald-50 border-emerald-200' : tile.wasSkipped ? 'bg-amber-50 border-amber-200' : tile.wasPlayed ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200';

                                return (
                                  <div key={tile.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${bgColor} transition-all`}>
                                    {/* Left: criterion context + full label */}
                                    <div className="flex-1 min-w-0">
                                      {tile.criterionText && (
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate leading-tight">{tile.criterionText}</p>
                                      )}
                                      <p className="text-xs font-black text-slate-800 leading-tight">{tile.label}</p>
                                    </div>
                                    {/* Right: parsed number chip + status */}
                                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                      <div className="flex flex-col items-center bg-white border border-amber-200 rounded-lg px-2.5 py-1 shadow-sm min-w-[48px]">
                                        <span className="text-base font-black text-amber-600 leading-none">{tile.parsed.number}</span>
                                        {tile.parsed.suffix && (
                                          <span className="text-[8px] font-bold text-slate-400 leading-tight">{tile.parsed.suffix}</span>
                                        )}
                                      </div>
                                      {statusIcon && (
                                        <span className={`text-[10px] font-black ${statusColor} w-4 text-center`}>{statusIcon}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Empty state for "played" tab */}
            {numTab === 'played' && playedNumericalTiles === 0 && (
              <div className="p-8 text-center">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-[11px] font-bold text-slate-400">No numerical tiles were played.</p>
              </div>
            )}
          </div>
        )}

        {/* ── CANVAS / CRITERIA REVIEW (non-numerical, or marathon) ────────── */}
        {(activeGameMode !== 'NUMERICAL' || tablesToReview.length > 0) && tablesToReview.map(table => {
          const tableCriteria = criteriaInCanvas.filter(c => c.tableName === table.name);
          const nonHeading = tableCriteria.filter(c => !c.isHeading);
          const tableAllSolved = nonHeading.length > 0 && nonHeading.every(c => c.allSolved);

          return (
            <div key={table.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className={`px-4 py-2.5 border-b ${tableAllSolved ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex justify-between items-center">
                  <p className="text-[12px] font-black text-clinical-blue uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">📋 {table.name}</p>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${tableAllSolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {nonHeading.filter(c => c.allSolved).length}/{nonHeading.length} complete
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ minWidth: 480 }}>
                  <thead>
                    <tr className={`border-b ${tableAllSolved ? 'bg-emerald-100/50 border-emerald-200' : 'bg-rose-100/50 border-rose-200'}`}>
                      <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200/50 w-6">#</th>
                      {(table.columnHeaders || []).map((h, i) => (
                        <th key={i} className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200/50">{h}</th>
                      ))}
                      <th className="p-2 text-[9px] font-black text-slate-500 uppercase w-16 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableCriteria.map((item, ci) => {
                      if (item.isHeading) {
                        return (
                          <tr key={item.row.id} className="border-b border-amber-200 bg-amber-100/50">
                            <td className="p-2 border-r border-amber-200/50 text-[10px] text-amber-700 font-black text-center">—</td>
                            {(item.row.cells || []).map((cell, idx) => (
                              <td key={idx} className="px-4 py-2 text-[10px] font-black text-amber-800 uppercase tracking-widest border-r border-amber-200/50 shadow-inner">
                                {cell.text}
                              </td>
                            ))}
                            <td className="p-2"></td>
                          </tr>
                        );
                      }

                      const { row, cellResults, allSolved } = item;
                      return (
                        <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="p-2 border-r border-slate-200/50 text-[10px] text-slate-500 font-bold text-center">{ci + 1}</td>
                          {(cellResults || []).map((cell, cellIndex) => {
                            const hasTiles = cell.tileResults && cell.tileResults.length > 0;
                            const cellSolved = hasTiles && cell.allSolved;
                            const cellFailed = hasTiles && !cell.allSolved && cell.tileResults.some(tr => !tr.solved);
                            const cellBg = cellSolved ? 'bg-emerald-100/70 shadow-inner border-emerald-200' : cellFailed ? 'bg-rose-100/70 shadow-inner border-rose-200' : 'bg-transparent border-slate-200/50';

                            return (
                              <td key={cellIndex} className={`p-2 border-r transition-colors ${cellBg}`}>
                                {(!cell.tiles || cell.tiles.length === 0) && (
                                  <p className="text-[11px] font-semibold text-slate-700 leading-tight mb-1">{cell.text}</p>
                                )}
                                {hasTiles && (
                                  <div className="flex flex-col gap-1 mt-2">
                                    {(cell.tiles || []).filter(t => cell.tileResults.some(tr => tr.tile.id === t.id)).map(t => {
                                      const tr = cell.tileResults.find(x => x.tile.id === t.id);
                                      if (!tr) return null;
                                      return (
                                        <div key={t.id} className="flex flex-col gap-0.5">
                                          <div className="flex items-start gap-1.5">
                                            {tr.presentedOnly ? (
                                              <div className="flex flex-shrink-0 items-center justify-center w-4 h-4 rounded-full text-[9px] font-black bg-slate-300 text-slate-600 shadow-sm mt-0.5">ℹ</div>
                                            ) : tr.skipped ? (
                                              <div className="flex flex-shrink-0 items-center justify-center w-4 h-4 rounded-full text-[9px] font-black bg-amber-400 text-white shadow-sm mt-0.5">⚠</div>
                                            ) : (
                                              <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${tr.solved ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'} mt-0.5`}>
                                                {tr.solved ? '✓' : '✗'}
                                              </div>
                                            )}
                                            <span className={`text-[10px] font-extrabold flex-1 leading-tight ${tr.presentedOnly ? 'text-slate-600' : tr.solved ? 'text-emerald-900' : tr.skipped ? 'text-amber-800' : 'text-rose-900'}`}>{t.label}</span>
                                          </div>
                                          {(t.subtiles || []).length > 0 && (
                                            <div className="flex flex-col gap-1 pl-3 border-l-2 border-slate-200/50 ml-2 mt-0.5">
                                              {(t.subtiles || []).filter(sub => cell.tileResults.some(tr => tr.tile.id === sub.id)).map(sub => {
                                                const subTr = cell.tileResults.find(x => x.tile.id === sub.id);
                                                if (!subTr) return null;
                                                return (
                                                  <div key={sub.id} className="flex items-start gap-1.5">
                                                    {subTr.presentedOnly ? (
                                                      <div className="flex flex-shrink-0 items-center justify-center w-3 h-3 rounded-full text-[7px] font-black bg-slate-300 text-slate-600 shadow-sm mt-0.5">ℹ</div>
                                                    ) : subTr.skipped ? (
                                                      <div className="flex flex-shrink-0 items-center justify-center w-3 h-3 rounded-full text-[7px] font-black bg-amber-400 text-white shadow-sm mt-0.5">⚠</div>
                                                    ) : (
                                                      <div className={`flex flex-shrink-0 items-center justify-center w-3 h-3 rounded-full text-[7px] font-black ${subTr.solved ? 'bg-emerald-500 text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'} mt-0.5`}>
                                                        {subTr.solved ? '✓' : '✗'}
                                                      </div>
                                                    )}
                                                    <span className={`text-[9px] font-bold flex-1 leading-tight ${subTr.presentedOnly ? 'text-slate-500' : subTr.solved ? 'text-emerald-800' : subTr.skipped ? 'text-amber-700' : 'text-rose-800'}`}>↳ {sub.label}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center">
                            <span className={`text-[9px] font-black ${allSolved ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {allSolved ? '✓ Found' : '✗ Missed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Empty state if nothing to review */}
        {tablesToReview.length === 0 && !isNumericalGame && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-[11px] font-bold text-slate-400">No criteria to review.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {isPreviewMode ? (
          <button onClick={() => { setScreen('CANVAS_COMPOSER'); setScore({ correct: 0, wrong: 0 }); setIsPreviewMode(false); }}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-extrabold py-3 rounded-lg shadow-md transition-all text-xs uppercase tracking-wider">
            Return to Composer
          </button>
        ) : (
          <button onClick={() => { setScreen('PLAYER_HOME'); setScore({ correct: 0, wrong: 0 }); }}
            className="w-full bg-clinical-blue hover:bg-blue-700 text-white font-extrabold py-3 rounded-lg shadow-md transition-all text-xs uppercase tracking-wider">
            Return to Portal
          </button>
        )}
      </div>
    </div>
  );
}
