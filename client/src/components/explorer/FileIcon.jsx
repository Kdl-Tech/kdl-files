const EXT_ICONS = {
  // Images
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼', bmp: '🖼', ico: '🖼', tiff: '🖼', avif: '🖼', heic: '🖼',
  // Vidéo
  mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬', webm: '🎬', flv: '🎬', wmv: '🎬', m4v: '🎬',
  // Audio
  mp3: '🎵', flac: '🎵', wav: '🎵', ogg: '🎵', aac: '🎵', m4a: '🎵', opus: '🎵', wma: '🎵',
  // Documents
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📑', pptx: '📑',
  odt: '📝', ods: '📊', odp: '📑', txt: '📃', rtf: '📃', md: '📃', csv: '📊', epub: '📚',
  // Archives
  zip: '📦', tar: '📦', gz: '📦', rar: '📦', '7z': '📦', bz2: '📦', xz: '📦',
  // Code
  js: '⚡', ts: '⚡', jsx: '⚡', tsx: '⚡', py: '🐍', java: '☕', c: '⚙️', cpp: '⚙️',
  cs: '⚙️', go: '🐹', rs: '🦀', php: '🐘', html: '🌐', css: '🎨', scss: '🎨',
  json: '📋', yaml: '📋', yml: '📋', sh: '💻', bat: '💻', xml: '📋', sql: '🗃',
  // Exécutables
  exe: '⚙️', msi: '⚙️', deb: '📦', rpm: '📦', appimage: '📦', dmg: '💿',
};

const TYPE_ICONS = {
  folder: '📁',
  image:   '🖼',
  video:   '🎬',
  audio:   '🎵',
  doc:     '📄',
  archive: '📦',
  code:    '⚡',
  other:   '📄',
};

export default function FileIcon({ file, size = 'sm' }) {
  const cls = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-base';
  const icon = file.isDir
    ? '📁'
    : (EXT_ICONS[file.ext] || TYPE_ICONS[file.type] || '📄');
  return <span className={`${cls} leading-none select-none`}>{icon}</span>;
}
