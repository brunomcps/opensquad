import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { BRollSource } from '../types/content';
import { useBRollStore } from '../store/useBRollStore';

const backdrop: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialog: CSSProperties = {
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
  padding: '28px', width: '480px', maxHeight: '80vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '20px',
};

const title: CSSProperties = {
  fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};

const subtitle: CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' };

const tabRow: CSSProperties = {
  display: 'flex', gap: '2px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '3px',
};

const tabBtn = (active: boolean): CSSProperties => ({
  flex: 1, background: active ? 'var(--bg-secondary)' : 'transparent',
  border: 'none', borderRadius: '6px', padding: '8px', fontSize: '13px',
  fontWeight: active ? 700 : 500, color: active ? 'var(--accent-gold-dark)' : 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: active ? 'var(--shadow-sm)' : 'none',
});

const inputStyle: CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: 'var(--font-body)',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
};

const selectStyle: CSSProperties = { ...inputStyle, appearance: 'auto' as any, cursor: 'pointer' };

const label: CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px',
  fontFamily: 'var(--font)',
};

const btnRow: CSSProperties = { display: 'flex', gap: '10px', justifyContent: 'flex-end' };

const cancelBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)', padding: '10px 20px', fontSize: '14px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font)',
};

const primaryBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)',
};

const resultBox: CSSProperties = {
  padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-primary)',
};

type Mode = 'file' | 'folder' | 'squad';

export function BRollImportDialog({ onClose }: { onClose: () => void }) {
  const addBRolls = useBRollStore((s) => s.addBRolls);
  const [mode, setMode] = useState<Mode>('file');
  const [filepath, setFilepath] = useState('');
  const [folderPath, setFolderPath] = useState('_opensquad/_library/brolls');
  const [squadLibrary, setSquadLibrary] = useState('squads/yt-broll/output/library/library-index.md');
  const [source, setSource] = useState<BRollSource>('other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleImportFile = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/brolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filepath,
          description,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          source,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        addBRolls([data.broll]);
        setResult(`B-roll adicionado: ${data.broll.id} (${data.broll.filename})`);
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  const handleScanFolder = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/brolls/scan-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, source }),
      });
      const data = await res.json();
      if (data.ok) {
        addBRolls(data.brolls);
        setResult(`Importados: ${data.imported} | Já existentes: ${data.skipped}`);
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  const handleImportSquad = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/brolls/import-squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryPath: squadLibrary }),
      });
      const data = await res.json();
      if (data.ok) {
        addBRolls(data.brolls);
        setResult(`Importados do squad: ${data.imported} b-rolls`);
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`Erro: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>
        <div>
          <div style={title}>Importar B-Rolls</div>
          <div style={subtitle}>Adicione b-rolls à sua biblioteca</div>
        </div>

        <div style={tabRow}>
          <button style={tabBtn(mode === 'file')} onClick={() => setMode('file')}>Arquivo</button>
          <button style={tabBtn(mode === 'folder')} onClick={() => setMode('folder')}>Pasta</button>
          <button style={tabBtn(mode === 'squad')} onClick={() => setMode('squad')}>Squad</button>
        </div>

        {mode === 'file' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={label}>Caminho do arquivo</div>
              <input style={inputStyle} placeholder="C:\...\video.mp4" value={filepath} onChange={(e) => setFilepath(e.target.value)} />
            </div>
            <div>
              <div style={label}>Descrição</div>
              <input style={inputStyle} placeholder="Cérebro brilhante 3D..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <div style={label}>Tags (separadas por vírgula)</div>
              <input style={inputStyle} placeholder="cérebro, neurônio, glow" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div>
              <div style={label}>Fonte</div>
              <select style={selectStyle} value={source} onChange={(e) => setSource(e.target.value as BRollSource)}>
                <option value="veo">Veo (Gemini)</option>
                <option value="grok">Grok (Aurora)</option>
                <option value="pexels">Pexels</option>
                <option value="pixabay">Pixabay</option>
                <option value="filmed">Gravado</option>
                <option value="remotion">Remotion</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
        )}

        {mode === 'folder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={label}>Caminho da pasta</div>
              <input style={inputStyle} placeholder="C:\...\brolls\" value={folderPath} onChange={(e) => setFolderPath(e.target.value)} />
            </div>
            <div>
              <div style={label}>Fonte dos vídeos</div>
              <select style={selectStyle} value={source} onChange={(e) => setSource(e.target.value as BRollSource)}>
                <option value="veo">Veo (Gemini)</option>
                <option value="pexels">Pexels</option>
                <option value="pixabay">Pixabay</option>
                <option value="filmed">Gravado</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div style={subtitle}>Importa todos os arquivos .mp4, .webm e .mov da pasta. Arquivos já importados serão ignorados.</div>
          </div>
        )}

        {mode === 'squad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={label}>Caminho do library-index.md</div>
              <input style={inputStyle} value={squadLibrary} onChange={(e) => setSquadLibrary(e.target.value)} />
            </div>
            <div style={subtitle}>Importa b-rolls catalogados pelo squad yt-broll. Lê a tabela markdown e cria entradas com metadata, tags e prompts.</div>
          </div>
        )}

        {result && <div style={resultBox}>{result}</div>}

        <div style={btnRow}>
          <button style={cancelBtn} onClick={onClose}>Fechar</button>
          <button
            style={{ ...primaryBtn, opacity: loading ? 0.5 : 1 }}
            disabled={loading}
            onClick={mode === 'file' ? handleImportFile : mode === 'folder' ? handleScanFolder : handleImportSquad}
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
