import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const FROM = 'CompreOuVenda <noreply@compreouvenda.com>';

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM, to, subject: 'Bem-vindo ao CompreOuVenda! 🎉',
    html: emailTemplate(`
      <h1 style="color:#5B2D8E;margin:0">Bem-vindo, ${name}!</h1>
      <p>Sua conta foi criada com sucesso no <strong>CompreOuVenda</strong>.</p>
      <p>Agora você pode:</p>
      <ul>
        <li>📦 Anunciar produtos em segundos</li>
        <li>💬 Negociar diretamente com compradores</li>
        <li>💰 Receber pagamentos com segurança</li>
      </ul>
      <a href="https://compreouvenda.vercel.app/product/new" style="display:inline-block;background:#5B2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Criar meu primeiro anúncio</a>
    `)
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return resend.emails.send({
    from: FROM, to, subject: 'Recuperação de senha - CompreOuVenda',
    html: emailTemplate(`
      <h1 style="color:#5B2D8E;margin:0">Recuperar senha</h1>
      <p>Você solicitou a recuperação de senha da sua conta.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <a href="${resetLink}" style="display:inline-block;background:#5B2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Redefinir minha senha</a>
      <p style="color:#666;font-size:12px;margin-top:24px">Se você não solicitou esta recuperação, ignore este e-mail. O link expira em 1 hora.</p>
    `)
  });
}

export async function sendOrderConfirmation(to: string, order: { id: string; product: string; amount: number }) {
  return resend.emails.send({
    from: FROM, to, subject: `Pedido confirmado #${order.id.slice(0,8)}`,
    html: emailTemplate(`
      <h1 style="color:#5B2D8E;margin:0">Pedido confirmado! ✅</h1>
      <p>Seu pagamento foi aprovado.</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0"><strong>Produto:</strong> ${order.product}</p>
        <p style="margin:8px 0 0"><strong>Valor:</strong> R$ ${order.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <p>O vendedor será notificado para enviar o produto.</p>
      <a href="https://compreouvenda.vercel.app/dashboard" style="display:inline-block;background:#5B2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Ver meus pedidos</a>
    `)
  });
}

export async function sendPaymentReceived(to: string, seller: { name: string; amount: number; product: string }) {
  return resend.emails.send({
    from: FROM, to, subject: '💰 Pagamento recebido!',
    html: emailTemplate(`
      <h1 style="color:#5B2D8E;margin:0">Você vendeu! 🎉</h1>
      <p>Olá, ${seller.name}! Um comprador pagou pelo seu produto.</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0"><strong>Produto:</strong> ${seller.product}</p>
        <p style="margin:8px 0 0"><strong>Valor recebido:</strong> R$ ${seller.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <p>Envie o produto ao comprador o mais rápido possível.</p>
      <a href="https://compreouvenda.vercel.app/dashboard" style="display:inline-block;background:#5B2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Ver detalhes</a>
    `)
  });
}

export async function sendNewMessageNotification(to: string, senderName: string, productTitle: string) {
  return resend.emails.send({
    from: FROM, to, subject: `💬 Nova mensagem de ${senderName}`,
    html: emailTemplate(`
      <h1 style="color:#5B2D8E;margin:0">Nova mensagem</h1>
      <p><strong>${senderName}</strong> enviou uma mensagem sobre <strong>${productTitle}</strong>.</p>
      <a href="https://compreouvenda.vercel.app/chat" style="display:inline-block;background:#5B2D8E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Responder</a>
    `)
  });
}

function emailTemplate(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
    <div style="text-align:center;margin-bottom:24px"><img src="https://compreouvenda.vercel.app/logo.png" alt="CompreOuVenda" style="height:40px" /></div>
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
    <p style="color:#999;font-size:11px;text-align:center">CompreOuVenda © ${new Date().getFullYear()} - Marketplace Social<br/>Você recebeu este e-mail porque tem uma conta no CompreOuVenda.</p>
  </body></html>`;
}
