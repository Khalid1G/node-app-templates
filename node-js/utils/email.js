/* eslint-disable class-methods-use-this */
const nodemailer = require("nodemailer");
const pug = require("pug");
const { convert } = require("html-to-text");

/**
 * Email class for sending emails to users.
 * @param {Object} user - The user object containing email and first name.
 * @param {string} url - The URL for the email content.
 * @param {Object} opt - Optional: Additional options for email customization.
 */
module.exports = class Email {
  constructor(user, url, opt) {
    this.to = user.email;
    this.firstName = user.fname;
    this.url = url;
    this.from = `${process.env.APP_NAME} ${process.env.EMAIL_FROM}`;
    this.options = {
      ...opt,
      email: user.email,
      supportEmail: process.env.EMAIL_SUPPORT,
    };
  }

  /**
   * Creates a nodemailer transport based on the environment configuration.
   * @returns {Transporter} - The nodemailer transporter.
   */
  newTransport() {
    if (process.env.NODE_ENV === "production") {
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Sends an email using the specified template and subject.
   * @param {string} template - The name of the pug template for email content.
   * @param {string} subject - The subject line of the email.
   */
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
      options: this.options,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html), // Convert HTML to plain text
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  /**
   * Email function,  sends a welcome email to the user.
   */
  async sendWelcome() {
    await this.send("welcome", "Welcome to the SITI tea Family!");
  }

  /**
   * Email function sends a password reset email to the user.
   */
  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      `Your password reset token (valid for only ${+process.env.PASS_REST_EXPIRES / 60 / 1000
      } minutes)`
    );
  }
};
