// api/contattaci.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // CORS: consenti solo il tuo dominio
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, messaggio: "Metodo non consentito" });

  try {
    const { nome, email, telefono, oggetto, messaggio } = req.body || {};
    if (!nome || !email || !messaggio) {
      return res.status(422).json({ ok: false, messaggio: "Campi obbligatori: nome, email, messaggio" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // true se usi 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `"AGF Petroli" <${process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || process.env.SMTP_USER,
      subject: `Contatto: ${oggetto || "Richiesta"} — ${nome}`,
      html: `
        <h3>Nuovo contatto dal sito</h3>
        <p><b>Nome:</b> ${nome}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Telefono:</b> ${telefono || "-"}</p>
        <p><b>Messaggio:</b><br/>${(messaggio || "").replace(/\n/g,"<br/>")}</p>
      `
    });

    return res.status(200).json({ ok: true, messaggio: "Email inviata!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, messaggio: "Errore invio" });
  }
}
