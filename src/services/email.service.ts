import nodemailer from 'nodemailer';
import logger from '../config/logger';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email transporter verification failed:', error);
  } else {
    logger.info('Email transporter is ready');
  }
});

export const emailService = {
  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, name: string, token: string) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: 'Email TYsdiqi - First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>First Ring AI</h1>
              </div>
              <div class="content">
                <h2>Salam ${name},</h2>
                <p>First Ring AI platformas1na xo_ gYlmisiniz!</p>
                <p>Email ¸nvan1n1z1 tYsdiqlYmYk ¸Á¸n a_a1dak1 linkY kliklYyin:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Email-i TYsdiqlY</a>
                </div>
                <p>VY ya bu linki brauzerdY aÁ1n:</p>
                <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
                <p><strong>Qeyd:</strong> Bu link 24 saat YrzindY etibarl1d1r.</p>
                <p>ègYr siz bu hesab1 yaratmam1s1n1zsa, bu emaili ignore edin.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. B¸t¸n h¸quqlar qorunur.</p>
                <p>HeÁ bir zYng cavabs1z qalmas1n!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Salam ${name},

          First Ring AI platformas1na xo_ gYlmisiniz!

          Email ¸nvan1n1z1 tYsdiqlYmYk ¸Á¸n bu linkY daxil olun:
          ${verificationUrl}

          Bu link 24 saat YrzindY etibarl1d1r.

          ègYr siz bu hesab1 yaratmam1s1n1zsa, bu emaili ignore edin.

          First Ring AI - HeÁ bir zYng cavabs1z qalmas1n!
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Verification email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  },

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(to: string, name: string) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: 'Xo_ GYlmisiniz - First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .feature { padding: 15px 0; border-bottom: 1px solid #ddd; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1><â Hesab1n1z Aktiv Edildi!</h1>
              </div>
              <div class="content">
                <h2>TYbrik edirik, ${name}!</h2>
                <p>Email ¸nvan1n1z uurla tYsdiqlYndi. 0ndi First Ring AI-1n b¸t¸n imkanlar1ndan istifadY edY bilYrsiniz.</p>

                <h3>NˆvbYti Add1mlar:</h3>
                <div class="feature">
                  <strong>1. Dashboard-a daxil olun</strong>
                  <p>Platforman1za daxil olaraq biznesinizi konfiqurasiya edin.</p>
                </div>
                <div class="feature">
                  <strong>2. AI Agent-i qura_d1r1n</strong>
                  <p>Biznes nˆv¸n¸z¸ seÁin vY agent davran1_1n1 tYyin edin.</p>
                </div>
                <div class="feature">
                  <strong>3. Telefon nˆmrYsi YlavY edin</strong>
                  <p>Twilio vY ya Retell AI ilY telefon nˆmrYnizi balay1n.</p>
                </div>
                <div class="feature">
                  <strong>4. Test edin</strong>
                  <p>0lk test zYnginizi edin vY nYticYni gˆr¸n.</p>
                </div>

                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Dashboard-a Get</a>
                </div>

                <p>Sual1n1z varsa, bizY yaz1n: <a href="mailto:${process.env.SALES_EMAIL}">${process.env.SALES_EMAIL}</a></p>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. B¸t¸n h¸quqlar qorunur.</p>
                <p>HeÁ bir zYng cavabs1z qalmas1n!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          TYbrik edirik, ${name}!

          Email ¸nvan1n1z uurla tYsdiqlYndi. 0ndi First Ring AI-1n b¸t¸n imkanlar1ndan istifadY edY bilYrsiniz.

          NˆvbYti add1mlar:
          1. Dashboard-a daxil olun
          2. AI Agent-i qura_d1r1n
          3. Telefon nˆmrYsi YlavY edin
          4. Test edin

          Dashboard: ${process.env.FRONTEND_URL}/dashboard

          Sual1n1z varsa, bizY yaz1n: ${process.env.SALES_EMAIL}

          First Ring AI - HeÁ bir zYng cavabs1z qalmas1n!
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Welcome email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      throw error;
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, token: string) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: '^ifrY YenilYmY - First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #DC2626;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>^ifrY YenilYmY</h1>
              </div>
              <div class="content">
                <h2>Salam ${name},</h2>
                <p>Hesab1n1z ¸Á¸n _ifrY yenilYmY tYlYbi ald1q.</p>
                <p>^ifrYnizi yenilYmYk ¸Á¸n a_a1dak1 linkY kliklYyin:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">^ifrYni YenilY</a>
                </div>
                <p>VY ya bu linki brauzerdY aÁ1n:</p>
                <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>

                <div class="warning">
                  <strong>† TYhl¸kYsizlik xYbYrdarl11:</strong>
                  <p>Bu link yaln1z 1 saat YrzindY etibarl1d1r.</p>
                  <p>ègYr siz bu tYlYbi gˆndYrmYmisinizsY, dYrhal hesab1n1z1 tYhl¸kYsizliyY al1n.</p>
                </div>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. B¸t¸n h¸quqlar qorunur.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Salam ${name},

          Hesab1n1z ¸Á¸n _ifrY yenilYmY tYlYbi ald1q.

          ^ifrYnizi yenilYmYk ¸Á¸n bu linkY daxil olun:
          ${resetUrl}

          Bu link yaln1z 1 saat YrzindY etibarl1d1r.

          ègYr siz bu tYlYbi gˆndYrmYmisinizsY, dYrhal hesab1n1z1 tYhl¸kYsizliyY al1n.

          First Ring AI
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Password reset email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  },
};
