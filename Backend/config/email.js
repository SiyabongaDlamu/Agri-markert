// backend/config/email.js
// Nodemailer setup for order confirmation emails.
// Uses Gmail with an App Password (not your main Gmail password).
// To get an App Password: Google Account > Security > 2-Step Verification > App passwords

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send order confirmation to buyer
async function sendOrderConfirmation(toEmail, buyerName, orderData) {
  const { orderId, items, total } = orderData;

  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px; border-bottom:1px solid #eee;">${item.name}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">${item.quantity}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">R ${item.lineTotal.toFixed(2)}</td>
          <td style="padding:8px; border-bottom:1px solid #eee; color:#666; font-size:12px;">by ${item.farmerName}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Inter,sans-serif; max-width:600px; margin:0 auto; padding:30px; background:#f9fafb; border-radius:16px;">
      <h1 style="color:#1e3a1e; margin-bottom:4px;">Agri-Market Hub</h1>
      <p style="color:#6b7280; margin-top:0;">Fresh from farm to table</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;">
      <h2 style="color:#2d6a4f;">Order Confirmed!</h2>
      <p>Hi <strong>${buyerName}</strong>, your order has been received.</p>
      <p style="background:#e6f4ea; padding:10px 16px; border-radius:8px; font-size:13px; color:#1e3a1e;">
        Order ID: <strong>${orderId}</strong>
      </p>
      <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 8px; text-align:left; font-size:13px;">Product</th>
            <th style="padding:10px 8px; text-align:center; font-size:13px;">Qty</th>
            <th style="padding:10px 8px; text-align:right; font-size:13px;">Total</th>
            <th style="padding:10px 8px; font-size:13px;">Farmer</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="text-align:right; font-size:18px; font-weight:700; color:#e67e22;">
        Total: R ${total.toFixed(2)}
      </p>
      <p style="color:#6b7280; font-size:13px;">
        Your fresh produce will be delivered soon. Thank you for supporting local farmers!
      </p>
      <p style="font-size:12px; color:#9ca3af; margin-top:30px;">© 2026 Agri-Market Hub · Fresh from farm to table</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Agri-Market Hub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Order Confirmed — R${total.toFixed(2)} (${orderId.slice(0, 8)})`,
    html,
  });
}

module.exports = { sendOrderConfirmation };
