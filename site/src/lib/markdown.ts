import { marked } from 'marked';
import { parse, renderSync, walkSync, ELEMENT_NODE } from 'ultrahtml';

const ALLOWED_ELEMENTS = new Set([
  'a', 'abbr', 'blockquote', 'br', 'code', 'del', 'details', 'div', 'em',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'input', 'li', 'ol', 'p',
  'pre', 's', 'span', 'strong', 'summary', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'ul',
]);

const DROP_ELEMENTS = new Set([
  'canvas', 'embed', 'form', 'iframe', 'math', 'meta', 'object', 'script',
  'style', 'svg', 'template',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'title']),
  input: new Set(['checked', 'disabled', 'type']),
  code: new Set(['class']),
  pre: new Set(['class']),
  '*': new Set(['id']),
};

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function isSafeUrl(value: string): boolean {
  if (value.startsWith('#') || value.startsWith('/')) return true;
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function sanitizeHtml(html: string): string {
  const doc = parse(html);

  walkSync(doc, (node: any, parent: any) => {
    if (node.type !== ELEMENT_NODE || !parent) return;

    if (DROP_ELEMENTS.has(node.name)) {
      parent.children = parent.children.filter((child: any) => child !== node);
      return;
    }

    if (!ALLOWED_ELEMENTS.has(node.name)) {
      parent.children = parent.children.flatMap((child: any) => child === node ? node.children ?? [] : child);
      return;
    }

    for (const [name, value] of Object.entries(node.attributes as Record<string, string>)) {
      const allowed = ALLOWED_ATTRIBUTES[node.name]?.has(name) || ALLOWED_ATTRIBUTES['*'].has(name);
      if (!allowed || name.toLowerCase().startsWith('on')) {
        delete node.attributes[name];
        continue;
      }
      if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
        delete node.attributes[name];
      }
    }

    if (node.name === 'a' && node.attributes.href) {
      node.attributes.rel = 'nofollow noopener noreferrer';
    }
    if (node.name === 'input' && node.attributes.type !== 'checkbox') {
      parent.children = parent.children.filter((child: any) => child !== node);
    }
  });

  return renderSync(doc);
}

export function renderMarkdown(md: string): string {
  return sanitizeHtml(marked.parse(md, { async: false }) as string);
}
