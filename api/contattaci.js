import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // CORS: consenti www e non-www
  const allowed = new Set([
    "https://www.agfpetroli.com",
    "https://agfpetroli.com",
  ]);
  const origin = req.headers.origin;
  if (allowed.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, messaggio: "Metodo non consentito" });

  try {
    // --- parsing body robusto (Vercel a volte non popola req.body) ---
    let body = req.body;
    if (!body) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8") || "{}";
      body = JSON.parse(raw);
    } else if (typeof body === "string") {
      body = JSON.parse(body || "{}");
    }

    const { nome, email, telefono, oggetto, messaggio } = body || {};
    if (!nome || !email || !messaggio) {
      return res
        .status(422)
        .json({ ok: false, messaggio: "Campi obbligatori: nome, email, messaggio" });
    }

    // --- SMTP transporter ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,                       // es: mail.agfpetroli.com
      port: Number(process.env.SMTP_PORT || 587),       // 587 STARTTLS oppure 465 SSL
      secure: process.env.SMTP_SECURE === "true",       // true se usi 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // forza STARTTLS se usi 587
      requireTLS: process.env.SMTP_SECURE !== "true",
    });

    const info = await transporter.sendMail({
      from: `"AGF Petroli" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || process.env.SMTP_USER,
      subject: `Contatto: ${oggetto || "Richiesta"} — ${nome}`,
      html: `
        <h3>Nuovo contatto dal sito</h3>
        <p><b>Nome:</b> ${nome}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Telefono:</b> ${telefono || "-"}</p>
        <p><b>Messaggio:</b><br/>${(messaggio || "").replace(/\n/g, "<br/>")}</p>
      `,
    });

    return res.status(200).json({ ok: true, messaggio: "Email inviata!", id: info.messageId });
  } catch (err) {
    console.error("API /contattaci error:", err);
    // Temporaneamente ritorniamo il dettaglio per debug (poi si può rimuovere "detail")
    return res.status(500).json({ ok: false, messaggio: "Errore invio", detail: String(err.message || err) });
  }
}
