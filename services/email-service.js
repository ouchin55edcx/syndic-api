const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: process.env.MAIL_PORT || 2525,
  auth: {
    user: process.env.MAIL_USER || 'your_mailtrap_user',
    pass: process.env.MAIL_PASS || 'your_mailtrap_password'
  }
});

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} options.html
 * @returns {Promise}
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || '"Property Management" <syndic@property.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new proprietaire
 * @param {Object} proprietaire
 * @param {string} password
 * @returns {Promise}
 */
const sendProprietaireWelcomeEmail = async (proprietaire, password) => {
  const subject = 'Welcome to Property Management System';

  const text = `
    Hello ${proprietaire.firstName} ${proprietaire.lastName},

    Welcome to our Property Management System!

    Your account has been created by the Syndic. Here are your login details:

    Email: ${proprietaire.email}
    Password: ${password}

    Please continue with you application.


    Best regards,
    Property Management Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a6ee0;">Welcome to Property Management System</h2>
      <p>Hello <strong>${proprietaire.firstName} ${proprietaire.lastName}</strong>,</p>
      <p>Welcome to our Property Management System!</p>
      <p>Your account has been created by the Syndic. Here are your login details:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Email:</strong> ${proprietaire.email}</p>
        <p><strong>Password:</strong> ${password}</p>
      </div>
      <p>Please login at: <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>
      <p>We recommend changing your password after your first login.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  `;

  return await sendEmail({
    to: proprietaire.email,
    subject,
    text,
    html
  });
};

/**
 * Send reunion invitation email to proprietaire
 * @param {Object} proprietaire 
 * @param {Object} reunion 
 * @returns {Promise} 
 */
const sendReunionInvitationEmail = async (proprietaire, reunion) => {
  const subject = `Meeting Invitation: ${reunion.title}`;

  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = new Date(reunion.date).toLocaleDateString('en-US', dateOptions);

  const text = `
    Hello ${proprietaire.firstName} ${proprietaire.lastName},

    You have been invited to a meeting:

    Title: ${reunion.title}
    Date: ${formattedDate}
    Time: ${reunion.startTime} - ${reunion.endTime}
    Location: ${reunion.location}

    Description:
    ${reunion.description}

    Please login to your account to accept or decline this invitation.

    Best regards,
    Property Management Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a6ee0;">Meeting Invitation</h2>
      <p>Hello <strong>${proprietaire.firstName} ${proprietaire.lastName}</strong>,</p>
      <p>You have been invited to a meeting:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Title:</strong> ${reunion.title}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${reunion.startTime} - ${reunion.endTime}</p>
        <p><strong>Location:</strong> ${reunion.location}</p>
      </div>
      <p><strong>Description:</strong></p>
      <p>${reunion.description}</p>
      <p>Please <a href="http://localhost:3000/login">login to your account</a> to accept or decline this invitation.</p>
      <p>Best regards,<br>Property Management Team</p>
    </div>
  `;

  return await sendEmail({
    to: proprietaire.email,
    subject,
    text,
    html
  });
};

module.exports = {
  sendEmail,
  sendProprietaireWelcomeEmail,
  sendReunionInvitationEmail
};
