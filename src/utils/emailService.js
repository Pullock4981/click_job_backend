import nodemailer from 'nodemailer';

// Check if email credentials are configured
const isEmailConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

// Create transporter only if credentials are provided
let transporter = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify transporter
  transporter.verify((error, success) => {
    if (error) {
      console.warn('Email service error:', error.message);
      console.warn('Email functionality will be disabled. Please configure SMTP credentials in .env');
    } else {
      console.log('Email service is ready');
    }
  });
} else {
  console.warn('Email service not configured. SMTP credentials missing in .env file.');
  console.warn('Email functionality will be disabled. Add SMTP_USER and SMTP_PASS to enable.');
}

// Send email
export const sendEmail = async (to, subject, html, text = '') => {
  if (!isEmailConfigured || !transporter) {
    console.warn(`Email not sent to ${to}: Email service not configured`);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `"Click Job" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Click Job!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name}!</h2>
          <p>Thank you for joining Click Job - the best microjob platform to make money online.</p>
          <p>Get started by:</p>
          <ul>
            <li>Browse available jobs</li>
            <li>Complete tasks and earn money</li>
            <li>Post your own jobs</li>
            <li>Refer friends and earn 5% commission</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, 'Welcome to Click Job!', html);
};

// Send verification email
export const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name}!</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy this link: ${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(
    user.email,
    'Verify Your Email - Click Job',
    html
  );
};

// Send password reset email
export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { color: #ef4444; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name}!</h2>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy this link: ${resetUrl}</p>
          <p class="warning">This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(
    user.email,
    'Reset Your Password - Click Job',
    html
  );
};

// Send job notification email
export const sendJobNotificationEmail = async (user, job, type) => {
  let subject = '';
  let message = '';

  switch (type) {
    case 'assigned':
      subject = 'Job Assigned';
      message = `You have been assigned to job: ${job.title}`;
      break;
    case 'approved':
      subject = 'Work Approved';
      message = `Your work for job "${job.title}" has been approved!`;
      break;
    case 'rejected':
      subject = 'Work Rejected';
      message = `Your work for job "${job.title}" has been rejected.`;
      break;
    default:
      subject = 'Job Update';
      message = `Update on job: ${job.title}`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${subject}</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name}!</h2>
          <p>${message}</p>
          <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" class="button">View Job</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(user.email, subject, html);
};

