/**
 * Last-resort error screen for a misconfigured deployment.
 *
 * Written with plain DOM + inline styles on purpose: it must render even if
 * React, the router, or the stylesheet failed to initialise. Anything fancier
 * risks reproducing the blank page it exists to prevent.
 */
export function renderConfigErrorScreen(missing: string[]): void {
  const root = document.getElementById("root");
  if (!root) return;

  const items = missing.map((name) => `<code style="${CODE}">${name}</code>`).join("");

  root.innerHTML = `
    <div style="${WRAP}">
      <div style="${CARD}">
        <div style="${ICON}">⚙️</div>
        <h1 style="${TITLE}">Configuração incompleta</h1>
        <p style="${TEXT}">
          O aplicativo foi publicado sem as variáveis de ambiente necessárias,
          por isso não conseguiu iniciar.
        </p>
        <p style="${LABEL}">Faltando:</p>
        <div style="${LIST}">${items}</div>
        <p style="${HINT}">
          Defina as variáveis no painel do provedor (Vercel &rsaquo; Settings &rsaquo;
          Environment Variables) e <strong>publique novamente</strong> &mdash; elas
          são embutidas durante o build.
        </p>
      </div>
    </div>
  `;
}

const WRAP = [
  "min-height:100dvh",
  "display:flex",
  "align-items:center",
  "justify-content:center",
  "padding:24px",
  "background:#faf7f5",
  "font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif",
].join(";");

const CARD = [
  "max-width:420px",
  "width:100%",
  "background:#fff",
  "border:1px solid #e9dfda",
  "border-radius:14px",
  "padding:28px 24px",
  "text-align:center",
  "box-shadow:0 4px 16px -8px rgba(0,0,0,.12)",
].join(";");

const ICON = "font-size:40px;line-height:1;margin-bottom:12px";
const TITLE = "margin:0 0 8px;font-size:18px;font-weight:600;color:#2b2124";
const TEXT = "margin:0 0 18px;font-size:14px;line-height:1.5;color:#8a7c80";
const LABEL = "margin:0 0 8px;font-size:12px;font-weight:600;color:#2b2124";
const LIST = "display:flex;flex-direction:column;gap:6px;margin-bottom:18px";
const CODE = [
  "display:block",
  "padding:8px 10px",
  "background:#f4eeeb",
  "border-radius:8px",
  "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
  "font-size:12px",
  "color:#b76e79",
].join(";");
const HINT = "margin:0;font-size:12px;line-height:1.5;color:#8a7c80";
