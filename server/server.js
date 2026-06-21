import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      return origin.startsWith(allowed);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política de CORS'));
    }
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', version: '1.0.0' });
});

// Support Ticket Endpoint
app.post('/api/support', async (req, res) => {
  const { name, email, subject, message, platform, appVersion, userAgent } = req.body;

  // 1. Strict Input Validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Nome inválido ou ausente.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail inválido ou ausente.' });
  }
  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    return res.status(400).json({ error: 'Assunto inválido ou ausente.' });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();
  const cleanPlatform = (platform || 'Desconhecida').trim();
  const cleanAppVersion = (appVersion || 'Desconhecida').trim();
  const cleanUserAgent = (userAgent || 'Desconhecido').trim();

  // 2. Build the Email Body
  const emailText = `Nome: ${cleanName}
E-mail: ${cleanEmail}
Assunto: ${cleanSubject}

Mensagem:
------------------------------------------
${cleanMessage}
------------------------------------------

Informações do Aparelho (Diagnóstico):
- Plataforma: ${cleanPlatform}
- Versão do App: v${cleanAppVersion}
- User Agent: ${cleanUserAgent}`;

  const mailOptions = {
    // To prevent spam filters from blocking the email, the "from" address should be the authenticated
    // SMTP user account, but we can set the sender name to the user's name.
    from: `"${cleanName} (App Infantil)" <${process.env.SMTP_USER || 'no-reply@sua-familia.com'}>`,
    to: process.env.SUPPORT_EMAIL_DEST || 'suporte.meuapp@gmail.com',
    replyTo: cleanEmail, // Sets the reply-to header so replies from Jira go directly to the parent
    subject: `Suporte: [${cleanSubject}] - ${cleanName}`,
    text: emailText
  };

  // 3. Configure Transporter (with Console Logging Fallback for Dev Mode)
  const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!isSmtpConfigured) {
    console.log('\n--- [MOCK EMAIL SENT TO SUPPORT] ---');
    console.log(`Para: ${mailOptions.to}`);
    console.log(`Responder para (Reply-To): ${mailOptions.replyTo}`);
    console.log(`Assunto: ${mailOptions.subject}`);
    console.log('Corpo:');
    console.log(mailOptions.text);
    console.log('-------------------------------------\n');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Ticket enviado com sucesso! (Modo de Desenvolvimento - E-mail printado no console do servidor)' 
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail(mailOptions);
    console.log(`E-mail de suporte enviado com sucesso de ${cleanEmail} para ${mailOptions.to}`);
    
    return res.status(200).json({ success: true, message: 'Ticket de suporte enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar e-mail por SMTP:', error);
    return res.status(500).json({ error: 'Erro interno ao processar e enviar o ticket de suporte.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`BFF rodando na porta ${PORT}`);
  console.log(`Origens CORS permitidas: ${allowedOrigins.join(', ')}`);
});
