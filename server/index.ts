import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { whatsAppChatbot } from "./whatsapp-chatbot";
import cors from 'cors';

const app = express();

// Configuração do CORS para permitir credenciais e requests de diferentes origens
app.use(cors({
  origin: true, // Permite qualquer origem em desenvolvimento
  credentials: true, // Permite cookies e autenticação entre origens
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Configurar o ambiente baseado na variável NODE_ENV
  // Usamos try/catch para garantir que a aplicação não falhe em diferentes ambientes
  try {
    // Em desenvolvimento, usamos o setup do Vite
    if (app.get("env") === "development") {
      log("Inicializando em modo de desenvolvimento com Vite");
      await setupVite(app, server);
    } 
    // Em produção, tentamos servir os arquivos estáticos
    else {
      log("Inicializando em modo de produção");
      try {
        serveStatic(app);
      } catch (error) {
        // Se falhar ao servir arquivos estáticos, cai para o modo de desenvolvimento
        log(`Erro ao servir arquivos estáticos: ${error}. Tentando modo de desenvolvimento.`);
        await setupVite(app, server);
      }
    }
  } catch (error) {
    log(`Erro ao configurar ambiente: ${error}`);
    // Não lançar o erro para evitar que a aplicação falhe completamente
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Inicializar o chatbot do WhatsApp após o servidor estar pronto
    try {
      const initialized = await whatsAppChatbot.initialize();
      if (initialized) {
        log('Chatbot do WhatsApp inicializado com sucesso', 'whatsapp-chatbot');
      } else {
        log('Não foi possível inicializar o chatbot do WhatsApp', 'whatsapp-chatbot');
      }
    } catch (error) {
      log(`Erro ao inicializar o chatbot do WhatsApp: ${error}`, 'whatsapp-chatbot');
    }
  });
})();
