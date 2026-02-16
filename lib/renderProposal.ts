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
      <h2>${escapeHtml(title)}</h2>
      <div class="content">${escapeHtml(body).replaceAll("\n", "<br />")}</div>
    </section>
  `;
};

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
    contacts,
    validUntil,
  } = proposal;

  const blocks = [
    section("Бизнес-задача", summary),
    section("Объем работ", scope),
    section("Сроки", timeline),
    section("Стоимость", price),
    section("Результаты", deliverables ?? ""),
    section("Нюансы", nuances ?? ""),
    section("Предпосылки", assumptions ?? ""),
    section("Контакты", contacts ?? ""),
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
        body {
          font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
          color: var(--text);
          margin: 0;
          padding: 0;
        }
        .page {
          padding: 32px 36px;
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
