import type { Proposal } from "./schema";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const section = (title: string, body: string) => {
  if (!body.trim()) return "";
  return `
    <section class="block">
      ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
      <div class="content">${escapeHtml(body).replaceAll("\n", "<br />")}</div>
    </section>
  `;
};

const sanitizeRichHtml = (html: string) => {
  let safe = html;
  safe = safe.replace(
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\1\s*>/gi,
    ""
  );
  safe = safe.replace(/on\w+="[^"]*"/gi, "");
  safe = safe.replace(/on\w+='[^']*'/gi, "");

  safe = safe.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag, attrs) => {
    const allowed = ["p", "br", "strong", "b", "ul", "ol", "li", "a"];
    const name = String(tag).toLowerCase();
    if (!allowed.includes(name)) return "";
    if (name !== "a") return `<${match.startsWith("</") ? "/" : ""}${name}>`;

    const hrefMatch = String(attrs).match(/href\s*=\s*["']([^"']+)["']/i);
    const href = hrefMatch?.[1] ?? "";
    if (!href || !/^(https?:|mailto:)/i.test(href)) {
      return match.startsWith("</") ? "</a>" : "<a>";
    }
    return match.startsWith("</")
      ? "</a>"
      : `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
  });
  return safe;
};

const sectionRich = (title: string, body: string) => {
  if (!body.trim()) return "";
  return `
    <section class="block">
      ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
      <div class="content rich">${sanitizeRichHtml(body)}</div>
    </section>
  `;
};

const applyDigitBold = (text: string) =>
  escapeHtml(text).replace(/\d+/g, "<strong>$&</strong>");

export const renderProposalHtml = (proposal: Proposal) => {
  const {
    clientName,
    serviceName,
    clientLogoDataUrl,
    summary,
    scope,
    timeline,
    price,
    nuances,
    assumptions,
    deliverables,
    contactEmail,
    contactTelegram,
    contactPhone,
    validUntil,
  } = proposal;

  const blocks = [
    sectionRich("Бизнес-задача", summary),
    sectionRich("Дизайн-задача", scope),
    sectionRich("Сроки", applyDigitBold(timeline)),
    sectionRich("Стоимость", applyDigitBold(price)),
    section("", nuances ?? ""),
    section("Предпосылки", assumptions ?? ""),
    section(
      "Контакты",
      [contactEmail, contactTelegram, contactPhone].filter(Boolean).join("\n")
    ),
    section("Действует до", validUntil ?? ""),
  ]
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Коммерческое предложение</title>
      <style>
        :root {
          --text: #111827;
          --muted: #6b7280;
          --border: #e5e7eb;
          --accent: #0f172a;
        }
        * { box-sizing: border-box; }
        @page {
          size: A4;
          margin: 0;
        }
        body {
          font-family: "PT Sans Narrow", Arial, sans-serif;
          color: var(--text);
          margin: 0;
          padding: 0;
          background: #ffffff;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 14mm;
          margin: 0 auto;
        }
        header {
          border-bottom: 2px solid var(--accent);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        header h1 {
          font-size: 24px;
          margin: 0;
          letter-spacing: 0.3px;
        }
        header .meta {
          color: var(--muted);
          font-size: 13px;
        }
        .header-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
        }
        .logo {
          height: 36px;
          width: auto;
          object-fit: contain;
        }
        .block {
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .block h2 {
          font-size: 14px;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .block .content {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text);
        }
        .block .content.rich p {
          margin: 0 0 8px 0;
        }
        .block .content.rich ul,
        .block .content.rich ol {
          margin: 4px 0 8px 18px;
          padding: 0;
          list-style-position: outside;
        }
        .block .content.rich li {
          margin: 2px 0;
        }
        .block .content.rich a {
          color: #0e509e;
          text-decoration: underline;
        }
        .block .content.rich ul {
          list-style-type: disc;
        }
        .block .content.rich ol {
          list-style-type: decimal;
        }
        footer {
          margin-top: 22px;
          font-size: 12px;
          color: var(--muted);
        }
      </style>
    </head>
    <body>
      <div class="page">
        <header>
          <div class="meta">Коммерческое предложение на ${escapeHtml(
            serviceName
          )}</div>
          <div class="header-row">
            ${
              clientLogoDataUrl
                ? `<img class="logo" src="${clientLogoDataUrl}" alt="logo" />`
                : ""
            }
            <h1>${escapeHtml(clientName)}</h1>
          </div>
        </header>
        ${blocks}
        <footer>Сформировано в compot</footer>
      </div>
    </body>
  </html>`;
};
