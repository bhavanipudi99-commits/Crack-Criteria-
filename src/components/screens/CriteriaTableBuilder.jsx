import React, { useState, useRef, useEffect } from 'react';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

export default function CriteriaTableBuilder({ criteriaTables, setCriteriaTables, selectedTableId, setScreen }) {
  const [builderCriteria, setBuilderCriteria] = useState([]);
  const [selectionPopup, setSelectionPopup] = useState(null);
  const pasteAreaRef = useRef(null);

  useEffect(() => {
    if (selectedTableId) {
      const table = criteriaTables.find(t => t.id === selectedTableId);
      if (table && table.rows) {
        setBuilderCriteria(JSON.parse(JSON.stringify(table.rows)));
      }
    }
  }, [selectedTableId]);

  const handlePaste = (e) => {
    e.preventDefault();
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const rows = [];

    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      if (trs.length) {
        trs.forEach((tr, i) => {
          const cells = Array.from(tr.querySelectorAll('td,th')).map(c => c.textContent?.trim() || '');
          if (!cells.length || cells.every(c => !c)) return;
          const critId = uid('crit');
          const rowCells = Array.from({ length: table.columnCount }).map((_, i) => ({
             text: cells[i] || '', category: '', tiles: [{ id: uid('tile'), label: (cells[i] || '') }]
          }));
          rows.push({ id: critId, cells: rowCells, isHeading: false });
        });
        if (rows.length && pasteAreaRef.current) {
          const preview = trs.map(tr => {
            const cs = Array.from(tr.querySelectorAll('td,th'));
            return `<tr>${cs.map(c => `<td style="border:1px solid #e2e8f0;padding:4px 8px;font-size:11px;">${c.textContent.trim()}</td>`).join('')}</tr>`;
          }).join('');
          pasteAreaRef.current.innerHTML = `<table style="border-collapse:collapse;width:100%;">${preview}</table>`;
        }
      }
    }

    if (!rows.length) {
      plain.split('\n').filter(l => l.trim()).forEach((line, i) => {
        const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : null;
        const cols = sep ? line.split(sep).map(c => c.trim()) : [line.trim()];
        const critId = uid('crit');
        const rowCells = Array.from({ length: table.columnCount }).map((_, i) => ({
             text: cols[i] || '', category: '', tiles: [{ id: uid('tile'), label: (cols[i] || '') }]
        }));
        rows.push({ id: critId, cells: rowCells, isHeading: false });
      });
      if (pasteAreaRef.current) pasteAreaRef.current.innerText = plain;
    }
    if (rows.length) setBuilderCriteria(p => [...p, ...rows]);
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 2) { setSelectionPopup(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const areaRect = pasteAreaRef.current?.getBoundingClientRect();
    if (!areaRect) return;
    setSelectionPopup({ x: rect.left - areaRect.left + rect.width / 2, y: rect.top - areaRect.top - 8, text });
  };

  const addFromSelection = () => {
    if (!selectionPopup) return;
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    const critId = uid('crit');
    const cells = Array.from({ length: table.columnCount }).map((_, i) => i === 0 
      ? { text: selectionPopup.text, category: '', tiles: [{ id: uid('tile'), label: selectionPopup.text }] }
      : { text: '', category: '', tiles: [{ id: uid('tile'), label: '' }] }
    );
    setBuilderCriteria(p => [...p, { id: critId, cells, isHeading: false }]);
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  const toggleTileCount = (rowId, cellIndex, count) => {
    setBuilderCriteria(p => p.map(r => {
      if (r.id !== rowId) return r;
      const cells = [...r.cells];
      const c = cells[cellIndex];
      if (count === 1) cells[cellIndex] = { ...c, tiles: [c.tiles[0] || { id: uid('tile'), label: '' }] };
      else {
        const a = c.tiles[0] || { id: uid('tile'), label: '' };
        const b = c.tiles[1] || { id: uid('tile'), label: '' };
        cells[cellIndex] = { ...c, tiles: [a, b] };
      }
      return { ...r, cells };
    }));
  };

  const updateRow = (rowId, field, val) => setBuilderCriteria(p => p.map(r => r.id === rowId ? { ...r, [field]: val } : r));
  const updateCell = (rowId, cellIndex, field, val) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    let tiles = cells[cellIndex].tiles;
    if (field === 'text' && tiles.length === 1) {
      tiles = [{ ...tiles[0], label: val }];
    }
    cells[cellIndex] = { ...cells[cellIndex], [field]: val, tiles };
    return { ...r, cells };
  }));
  
  const updateTileLabel = (rowId, cellIndex, ti, val) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    tiles[ti] = { ...tiles[ti], label: val };
    
    let cellText = cells[cellIndex].text;
    if (tiles.length === 1 && ti === 0) {
      cellText = val;
    }
    
    cells[cellIndex] = { ...cells[cellIndex], text: cellText, tiles };
    return { ...r, cells };
  }));

  const addSubtile = (rowId, cellIndex, ti) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    tiles[ti] = { ...tiles[ti], subtiles: [...(tiles[ti].subtiles || []), { id: uid('subtile'), label: '' }] };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const updateSubtileLabel = (rowId, cellIndex, ti, si, val) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    const subtiles = [...(tiles[ti].subtiles || [])];
    subtiles[si] = { ...subtiles[si], label: val };
    tiles[ti] = { ...tiles[ti], subtiles };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const deleteSubtile = (rowId, cellIndex, ti, si) => setBuilderCriteria(p => p.map(r => {
    if (r.id !== rowId) return r;
    const cells = [...r.cells];
    const tiles = [...cells[cellIndex].tiles];
    const subtiles = [...(tiles[ti].subtiles || [])];
    subtiles.splice(si, 1);
    tiles[ti] = { ...tiles[ti], subtiles };
    cells[cellIndex] = { ...cells[cellIndex], tiles };
    return { ...r, cells };
  }));

  const removeCrit = (critId) => setBuilderCriteria(p => p.filter(c => c.id !== critId));

  const addColumnToTable = () => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    if (table.columnCount >= 4) { alert('Max 4 columns'); return; }
    
    setCriteriaTables(p => p.map(t => {
      if (t.id !== selectedTableId) return t;
      return {
        ...t,
        columnCount: t.columnCount + 1,
        columnHeaders: [...t.columnHeaders, `Column ${t.columnCount + 1}`],
        rows: t.rows.map(r => ({ ...r, cells: [...r.cells, { text: '', category: '', tiles: [{ id: uid('tile'), label: '' }] }] }))
      };
    }));
    setBuilderCriteria(p => p.map(r => ({ ...r, cells: [...r.cells, { text: '', category: '', tiles: [{ id: uid('tile'), label: '' }] }] })));
  };

  const deleteColumnFromTable = (colIndex) => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    if (table.columnCount <= 1) { alert('Min 1 column'); return; }
    if (!window.confirm('Delete this column and all its contents?')) return;
    
    setCriteriaTables(p => p.map(t => {
      if (t.id !== selectedTableId) return t;
      return {
        ...t,
        columnCount: t.columnCount - 1,
        columnHeaders: t.columnHeaders.filter((_, i) => i !== colIndex),
        rows: t.rows.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== colIndex) }))
      };
    }));
    setBuilderCriteria(p => p.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== colIndex) })));
  };

  const addBlankCrit = () => { 
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    const id = uid('crit'); 
    const cells = Array.from({ length: table.columnCount }).map(() => ({
      text: '', category: '', tiles: [{ id: uid('tile'), label: '' }]
    }));
    setBuilderCriteria(p => [...p, { id, cells, isHeading: false }]); 
  };

  const insertBlankCrit = (index) => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    const id = uid('crit'); 
    const cells = Array.from({ length: table.columnCount }).map(() => ({
      text: '', category: '', tiles: [{ id: uid('tile'), label: '' }]
    }));
    setBuilderCriteria(p => {
      const newArr = [...p];
      newArr.splice(index, 0, { id, cells, isHeading: false });
      return newArr;
    });
  };

  const saveToTable = () => {
    const table = criteriaTables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    // Valid rows: at least one cell must have text. If normal, all tiles must have labels.
    const valid = builderCriteria.filter(row => {
      return row.cells.some(c => c.text.trim() || (c.tiles && c.tiles.some(t => t.label && t.label.trim())));
    });
    
    if (!valid.length && builderCriteria.length > 0) { alert('Complete required fields first.'); return; }
    
    setCriteriaTables(p => p.map(t => {
      if (t.id !== selectedTableId) return t;
      return { ...t, rows: valid };
    }));
    alert('Table saved successfully!');
  };

  const table = criteriaTables.find(t => t.id === selectedTableId);
  if (!table) return null;
  const saved = table.rows;

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <div>
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Criteria Tile Table</p>
              <h2 className="text-base font-black text-slate-900">{table.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400">{saved.length} rows</span>
            <button onClick={() => setScreen('ADMIN_HOME')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[10px] px-3 py-2 rounded-lg uppercase">← Back</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">① Paste Workspace</p>
              <p className="text-[9px] text-slate-500">Paste browser table → rows become criteria.</p>
            </div>
            <button onClick={() => { if (pasteAreaRef.current) pasteAreaRef.current.innerHTML = ''; setBuilderCriteria([]); }}
              className="text-[9px] font-bold text-rose-400 hover:text-rose-600 uppercase">Clear</button>
          </div>
          <div className="relative">
            <div ref={pasteAreaRef} contentEditable suppressContentEditableWarning onPaste={handlePaste} onMouseUp={handleMouseUp} onClick={() => setSelectionPopup(null)}
              className="min-h-[100px] max-h-[200px] overflow-y-auto p-3 text-xs text-slate-700 leading-relaxed focus:outline-none" style={{ overflowWrap: 'break-word' }}>
              <p className="text-slate-400">Paste table from browser here (Ctrl+V / ⌘V)…</p>
            </div>
            {selectionPopup && (
              <div className="absolute z-30 -translate-x-1/2 -translate-y-full" style={{ left: selectionPopup.x, top: selectionPopup.y }}>
                <button onMouseDown={e => { e.preventDefault(); addFromSelection(); }} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl whitespace-nowrap">📌 Create Criterion from Selection</button>
                <div className="flex justify-center"><div className="w-2 h-2 bg-indigo-600 rotate-45 -mt-1" /></div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
            <div>
              <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest">② Tile Table Builder</p>
              <p className="text-[9px] text-slate-500">Each row = criterion · Or mark as Heading</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={addColumnToTable} className="bg-white border border-violet-200 hover:border-violet-400 text-violet-600 font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg transition-colors">+ Column</button>
              <button onClick={addBlankCrit} className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg">+ Row</button>
            </div>
          </div>

          {/* Column Headers Config */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex gap-4 overflow-x-auto">
            <div className="w-6 flex-shrink-0" />
            {table.columnHeaders?.map((header, i) => (
              <div key={i} className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Column {i + 1}</label>
                  <button onClick={() => deleteColumnFromTable(i)} className="text-[9px] font-bold text-slate-300 hover:text-rose-500 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-transparent hover:border-rose-200 transition-colors">✕</button>
                </div>
                <input type="text" value={header} onChange={e => setCriteriaTables(p => p.map(t => t.id === table.id ? { ...t, columnHeaders: t.columnHeaders.map((h, hi) => hi === i ? e.target.value : h) } : t))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:border-violet-400 focus:outline-none shadow-sm" />
              </div>
            ))}
            <div className="w-24 flex-shrink-0" />
          </div>

          {builderCriteria.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[11px]">No staged criteria — paste above or click + Row</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {builderCriteria.map((row, ci) => (
                <div key={row.id} className={`p-3 space-y-2 ${row.isHeading ? 'bg-amber-50/50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] text-slate-400 font-black w-6 text-center mt-2">{ci + 1}</span>
                    
                    <div className="flex-1 flex gap-4 overflow-x-auto">
                      {row.cells.map((cell, cellIndex) => (
                        <div key={cellIndex} className={`flex-1 min-w-[200px] border rounded-xl p-2 flex flex-col gap-2 ${row.isHeading ? (row.headingType === 'sub' ? 'border-amber-200 bg-amber-50/50' : 'border-amber-400 bg-amber-100/80 shadow-inner') : 'border-slate-100 bg-slate-50'}`}>
                          {row.isHeading ? (
                            <input type="text" value={cell.text} placeholder={`${table.columnHeaders[cellIndex]} heading...`}
                              onChange={e => updateCell(row.id, cellIndex, 'text', e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded-lg focus:outline-none focus:border-violet-400 ${row.headingType === 'sub' ? 'border-amber-300 bg-white font-bold text-[11px] text-amber-700 uppercase shadow-sm' : 'border-amber-500 bg-white font-black text-[12px] text-amber-900 uppercase shadow-md'}`} />
                          ) : (
                            <>
                              {cell.tiles.length > 1 && (
                                <input type="text" value={cell.text} placeholder={`${table.columnHeaders[cellIndex]} full text...`}
                                  onChange={e => updateCell(row.id, cellIndex, 'text', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-slate-200 bg-white font-medium text-[11px] rounded-lg focus:outline-none focus:border-violet-400 mb-2" />
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Tiles:</span>
                                {[1, 2].map(n => (
                                  <button key={n} onClick={() => toggleTileCount(row.id, cellIndex, n)}
                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${cell.tiles.length === n ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                                    {n === 2 ? '2 🧩' : '1'}
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-col gap-2 mt-1.5">
                                {cell.tiles.map((tile, ti) => (
                                  <div key={tile.id} className="flex flex-col p-1.5 border border-slate-200 rounded bg-slate-50/50 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                      {ti > 0 && <span className="text-slate-300 font-black">+</span>}
                                      <input type="text" value={tile.label} placeholder={cell.tiles.length === 2 ? (ti === 0 ? 'Tile A...' : 'Tile B...') : 'Tile Label...'}
                                        onChange={e => updateTileLabel(row.id, cellIndex, ti, e.target.value)}
                                        className="flex-1 px-2 py-1 border-2 border-violet-200 rounded-lg text-[10px] font-bold bg-white focus:outline-none focus:border-violet-500" />
                                    </div>
                                    {tile.subtiles?.map((sub, si) => (
                                      <div key={sub.id} className="flex items-center gap-1 mt-1.5 pl-4 border-l-2 border-violet-200 ml-2">
                                        <span className="text-[8px] text-slate-400 font-black">↳</span>
                                        <input type="text" value={sub.label} placeholder="Subtile label..."
                                          onChange={e => updateSubtileLabel(row.id, cellIndex, ti, si, e.target.value)}
                                          className="flex-1 px-1 py-0.5 border-b border-slate-200 text-[9px] font-bold text-slate-700 focus:outline-none focus:border-violet-500 bg-transparent" />
                                        <button onClick={() => deleteSubtile(row.id, cellIndex, ti, si)} className="text-[8px] text-rose-300 hover:text-rose-500 font-black px-1">✕</button>
                                      </div>
                                    ))}
                                    <button onClick={() => addSubtile(row.id, cellIndex, ti)} className="text-[8px] font-black text-clinical-blue hover:text-blue-700 text-left mt-1 pl-6 uppercase tracking-wider">
                                      + Subtile
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 ml-2 w-24 flex-shrink-0">
                      <label className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-1.5 rounded border border-amber-100 cursor-pointer hover:bg-amber-100">
                        <input type="checkbox" checked={row.isHeading || false} onChange={e => { updateRow(row.id, 'isHeading', e.target.checked); if (e.target.checked && !row.headingType) updateRow(row.id, 'headingType', 'main'); }} className="accent-amber-600" />
                        Heading
                      </label>
                      {row.isHeading && (
                        <select value={row.headingType || 'main'} onChange={e => updateRow(row.id, 'headingType', e.target.value)} className="text-[9px] font-bold text-amber-700 bg-white border border-amber-200 rounded px-1 py-1 focus:outline-none">
                          <option value="main">Main Heading</option>
                          <option value="sub">Sub Heading</option>
                        </select>
                      )}
                      <button onClick={() => removeCrit(row.id)} className="text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase border border-slate-200 rounded px-2 py-1 bg-white hover:border-rose-200 hover:bg-rose-50">Remove</button>
                      <button onClick={() => insertBlankCrit(ci + 1)} className="text-violet-500 hover:text-violet-700 text-[10px] font-bold uppercase border border-violet-200 rounded px-2 py-1 bg-violet-50 hover:border-violet-300 hover:bg-violet-100 mt-2">+ Insert</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {builderCriteria.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] text-slate-500">{builderCriteria.length} rows</span>
              <button onClick={saveToTable}
                className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold py-2 px-5 rounded-xl text-[10px] uppercase tracking-wider shadow-lg shadow-violet-900/20">
                Save to Table →
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
        <button onClick={() => setScreen('ADMIN_HOME')}
          className="w-full bg-clinical-blue hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">Done — Back to Dashboard</button>
      </div>
    </div>
  );
}
