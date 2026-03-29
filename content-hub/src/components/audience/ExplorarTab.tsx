import { useState, useEffect, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';

const selectStyle: CSSProperties = {
  padding: '8px 12px', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', background: 'var(--bg-card)',
  color: 'var(--text-primary)', fontFamily: 'var(--font)',
  fontSize: 13, outline: 'none',
};
const inputStyle: CSSProperties = {
  padding: '8px 12px', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', background: 'var(--bg-card)',
  color: 'var(--text-primary)', fontFamily: 'var(--font)',
  fontSize: 13, outline: 'none', flex: 1,
};
const badge = (bg: string): CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
  fontSize: '11px', fontWeight: 700, background: bg, color: '#fff',
});
const likesBadge: CSSProperties = {
  display: 'inline-block', padding: '2px 8px', borderRadius: '8px',
  fontSize: '11px', fontWeight: 700, background: 'var(--accent-gold)',
  color: '#fff', marginRight: '8px', flexShrink: 0,
};

const filterBar: CSSProperties = {
  display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
  padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
};
const commentCardStyle: CSSProperties = {
  padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  display: 'flex', flexDirection: 'column', gap: '6px',
};
const commentContent: CSSProperties = {
  fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)',
  lineHeight: 1.5,
};
const commentMeta: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
  fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)',
};
const loadMoreBtn: CSSProperties = {
  padding: '10px 24px', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', background: 'var(--bg-card)',
  color: 'var(--text-primary)', fontFamily: 'var(--font)',
  fontWeight: 600, fontSize: 13, cursor: 'pointer', alignSelf: 'center',
};
const resultsBadge: CSSProperties = {
  ...badge('var(--accent-gold)'),
  fontSize: '12px', padding: '4px 10px',
};

interface Comment {
  video: string;
  author: string;
  content: string;
  likes: number;
  categoria: string;
  publishedTime: string;
  isReply: boolean;
  replies: number;
}

interface Filters {
  videos: string[];
  categories: string[];
}

interface Props {
  initialSearch?: string;
}

export function ExplorarTab({ initialSearch = '' }: Props) {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [video, setVideo] = useState('');
  const [category, setCategory] = useState('');
  const [minLikes, setMinLikes] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ videos: [], categories: [] });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update search when initialSearch changes (from onExplore)
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      setDebouncedSearch(initialSearch);
    }
  }, [initialSearch]);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Fetch filters on mount
  useEffect(() => {
    fetch('/api/audience/comments/filters')
      .then(r => r.json())
      .then(setFilters)
      .catch(() => {});
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (video) params.set('video', video);
      if (category) params.set('category', category);
      if (minLikes > 0) params.set('minLikes', String(minLikes));
      params.set('offset', String((pageNum - 1) * 30));
      params.set('limit', '30');

      const res = await fetch(`/api/audience/comments?${params.toString()}`);
      const json = await res.json();
      setComments(prev => append ? [...prev, ...json.comments] : json.comments);
      setTotal(json.total ?? 0);
    } catch {
      if (!append) setComments([]);
    }
    setLoading(false);
  }, [debouncedSearch, video, category, minLikes]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
    fetchComments(1, false);
  }, [fetchComments]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Filter bar */}
      <div style={filterBar}>
        <select style={selectStyle} value={video} onChange={e => setVideo(e.target.value)}>
          <option value="">Todos os videos</option>
          {filters.videos.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Todas categorias</option>
          {filters.categories.map(c => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <input
          style={inputStyle}
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <input
          style={{ ...inputStyle, flex: 'none', width: '80px' }}
          type="number"
          placeholder="Min likes"
          min={0}
          value={minLikes || ''}
          onChange={e => setMinLikes(Number(e.target.value) || 0)}
        />

        <span style={resultsBadge}>
          {total.toLocaleString('pt-BR')} resultados
        </span>
      </div>

      {/* Comment list */}
      {loading && comments.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
          Carregando comentarios...
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
          Nenhum comentario encontrado.
        </div>
      )}

      {comments.map((c, i) => (
        <div key={i} style={commentCardStyle}>
          <div style={commentContent}>
            <span style={likesBadge}>{c.likes}</span>
            {c.content}
          </div>
          <div style={commentMeta}>
            <span>{c.author}</span>
            <span>·</span>
            <span>{c.video}</span>
            {c.categoria && <>
              <span>·</span>
              <span style={badge('#6366f1')}>{c.categoria.replace(/_/g, ' ')}</span>
            </>}
            {c.publishedTime && <>
              <span>·</span>
              <span>{c.publishedTime}</span>
            </>}
            {c.isReply && <span style={badge('#94a3b8')}>resposta</span>}
          </div>
        </div>
      ))}

      {/* Load more */}
      {comments.length > 0 && comments.length < total && (
        <button
          style={loadMoreBtn}
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </div>
  );
}
