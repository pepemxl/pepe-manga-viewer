import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AppBar from '../components/AppBar.jsx';
import { Btn, Chip, Cover, Radio } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';

// 3-step wizard: pick source → confirm structure → tag & shelf.

export default function ImportWizard() {
  const nav = useNavigate();
  const [step, setStep]       = useState(1);
  const [path, setPath]       = useState('/manga');
  const [browse, setBrowse]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [selected, setSel]    = useState({});  // {fullPath: bool}
  const [shelf, setShelf]     = useState('reading');
  const [busy, setBusy]       = useState(false);
  const [msg,  setMsg]        = useState('');

  // browse for step 1
  useEffect(() => {
    if (step !== 1) return;
    api.browse(path).then(setBrowse).catch(err => setMsg(String(err)));
  }, [path, step]);

  // preview when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setBusy(true);
    api.importPreview(path).then(r => {
      setPreview(r);
      const init = {};
      r.items.forEach(it => { init[it.path] = true; });
      setSel(init);
    }).catch(err => setMsg(String(err))).finally(() => setBusy(false));
  }, [step, path]);

  const commit = async () => {
    setBusy(true);
    const itemPaths = Object.entries(selected).filter(([, on]) => on).map(([p]) => p);
    try {
      const r = await api.importCommit(path, itemPaths);
      setMsg(`Imported ${r.series} series · ${r.chapters} chapters`);
      setTimeout(() => nav('/'), 800);
    } catch (err) {
      setMsg(String(err));
    } finally {
      setBusy(false);
    }
  };

  const rescan = async () => {
    setBusy(true);
    try {
      const r = await api.rescan();
      setMsg(`Re-scan complete: +${r.series} series, +${r.chapters} chapters`);
    } catch (e) { setMsg(String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="app-shell">
      <AppBar search={false} />
      <Stepper step={step} />

      <div style={{ flex: 1, padding: '18px 24px', display: 'flex', gap: 18, minHeight: 0 }}>
        {step === 1 && (
          <StepOne
            path={path} setPath={setPath} browse={browse}
            onNext={() => setStep(2)}
            onRescan={rescan}
          />
        )}
        {step === 2 && (
          <StepTwo
            path={path} preview={preview} selected={selected} setSel={setSel}
            busy={busy}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepThree
            preview={preview} selected={selected}
            shelf={shelf} setShelf={setShelf} busy={busy}
            onBack={() => setStep(2)}
            onCommit={commit}
          />
        )}
      </div>

      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}

function Stepper({ step }) {
  const items = [
    [1, 'Pick source'],
    [2, 'Confirm structure'],
    [3, 'Tag & shelf'],
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 24px', borderBottom: '1px dashed var(--faint)',
    }}>
      {items.map(([n, label], i) => {
        const st = n < step ? 'done' : n === step ? 'current' : 'later';
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '1.5px solid var(--ink)',
              background: st === 'current' ? 'var(--accent)' : (st === 'done' ? 'var(--ink)' : 'var(--paper)'),
              color: st === 'later' ? 'var(--ink)' : 'var(--paper)',
              fontFamily: 'var(--mono)', fontSize: 11,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{st === 'done' ? '✓' : n}</span>
            <span style={{ fontFamily: 'var(--hand)', fontSize: 15, color: st === 'later' ? 'var(--muted)' : 'var(--ink)' }}>
              {label}
            </span>
            {i < items.length - 1 && <span style={{ width: 40, borderTop: '1.5px dashed var(--muted)' }} />}
          </div>
        );
      })}
    </div>
  );
}

function StepOne({ path, setPath, browse, onNext, onRescan }) {
  return (
    <>
      <div className="sk-box-flat" style={{ width: 340, padding: 12, overflow: 'auto' }}>
        <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>BROWSE</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            value={path}
            onChange={e => setPath(e.target.value)}
            style={{
              flex: 1, padding: '4px 6px', fontFamily: 'var(--mono)', fontSize: 11,
              border: '1px solid var(--ink2)', borderRadius: 4, background: 'var(--paper)',
            }}
          />
        </div>
        {browse?.parent && (
          <div
            style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', cursor: 'pointer', padding: '4px 0' }}
            onClick={() => setPath(browse.parent)}
          >
            ↑ {browse.parent}
          </div>
        )}
        {browse?.items?.map(it => (
          <div
            key={it.path}
            onClick={() => it.is_dir && setPath(it.path)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 0',
              cursor: it.is_dir ? 'pointer' : 'default',
              color: it.is_dir ? 'var(--ink)' : 'var(--ink2)',
            }}
          >
            {it.is_dir ? '▸ ' : '· '}{it.name}
          </div>
        )) || <div style={{ color: 'var(--muted)', fontFamily: 'var(--hand)' }}>browse a folder…</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--hand)', fontSize: 26, fontWeight: 700 }}>Add to your library</div>
        <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)' }}>
          Pick a folder. We'll detect series (one subfolder = one series), chapters (.cbz or subfolders), and pages (.jpg/.png/.webp).
        </div>

        <div className="sk-box-dashed" style={{
          padding: 24, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16, background: 'var(--panel)',
          flex: 1, justifyContent: 'center', minHeight: 240,
        }}>
          <div style={{
            width: 80, height: 80, border: '1.5px dashed var(--ink)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--hand)', fontSize: 36,
          }}>⤓</div>
          <div style={{ fontFamily: 'var(--hand)', fontSize: 20, fontWeight: 700 }}>
            Selected: <span className="sk-under">{path}</span>
          </div>
          <div className="sk-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            accepts: .cbz · .zip · folder-of-images
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onRescan}>↺ rescan all</Btn>
          <Btn primary onClick={onNext}>preview →</Btn>
        </div>
      </div>
    </>
  );
}

function StepTwo({ path, preview, selected, setSel, busy, onBack, onNext }) {
  const items = preview?.items || [];
  const totalCh = items.reduce((a, it) => a + (it.chapter_count || 0), 0);
  return (
    <>
      <div className="sk-box-flat" style={{ width: 340, padding: 12, overflow: 'auto' }}>
        <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>SELECTED · {path}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink2)', lineHeight: 1.9 }}>
          ▾ {path.split('/').pop() || '/'}/
          {items.map(it => (
            <div key={it.path}>{'  '}▸ {it.name}/  <span style={{ color: 'var(--muted)' }}>({it.chapter_count} ch)</span></div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--hand)', fontSize: 22, fontWeight: 700 }}>
          We found <span className="sk-under">{items.length} series · {totalCh} chapters</span>
        </div>
        <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--ink2)' }}>
          Untick anything you don't want — then continue.
        </div>

        <div className="sk-box-flat" style={{ flex: 1, overflow: 'auto' }}>
          {busy && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>scanning…</div>}
          {items.map(it => (
            <div
              key={it.path}
              style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 12px', borderBottom: '1px dashed var(--faint)',
              }}
            >
              <Radio on={!!selected[it.path]} onClick={() => setSel(s => ({ ...s, [it.path]: !s[it.path] }))} />
              <Cover w={28} h={40} tag="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--hand)', fontSize: 15 }}>{it.name}</div>
                <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {it.chapter_count} ch · {it.format}
                </div>
              </div>
              <Chip>{it.kind}</Chip>
              <Chip>{it.direction}</Chip>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onBack}>back</Btn>
          <Btn accent onClick={onNext}>continue →</Btn>
        </div>
      </div>
    </>
  );
}

function StepThree({ preview, selected, shelf, setShelf, busy, onBack, onCommit }) {
  const chosen = (preview?.items || []).filter(it => selected[it.path]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 22, fontWeight: 700 }}>
        Tag & shelf — last step
      </div>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--ink2)' }}>
        We'll add these {chosen.length} series to the <strong>{shelf}</strong> shelf. Adjust if you like.
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {['reading', 'plan to read', 'finished', 'on hold'].map(s => (
          <Chip key={s} on={shelf === s} onClick={() => setShelf(s)}>{s}</Chip>
        ))}
      </div>
      <div className="sk-box-flat" style={{ flex: 1, overflow: 'auto', padding: 10 }}>
        {chosen.map(it => (
          <div key={it.path} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 4px' }}>
            <Cover w={28} h={40} tag="" />
            <div style={{ flex: 1, fontFamily: 'var(--hand)', fontSize: 15 }}>{it.name}</div>
            <Chip>{it.kind}</Chip>
            <Chip>{it.direction}</Chip>
            <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{it.chapter_count} ch</span>
          </div>
        ))}
        {!chosen.length && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>nothing selected</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn onClick={onBack}>back</Btn>
        <Btn accent onClick={onCommit} disabled={busy || !chosen.length}>
          import {chosen.length} series →
        </Btn>
      </div>
    </div>
  );
}
