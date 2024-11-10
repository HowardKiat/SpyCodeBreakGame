// routes/forgot-password.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../../../SpyGame/backend/db');
const transport = require('./sendEmail'); // Adjust the path as necessary

// GET route for rendering the forgot password page
router.get('/', (req, res) => {
  res.render('forgot-password');
});

router.post('/', async (req, res) => {
  const { email } = req.body;

  // Generate a secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiration = Date.now() + 3600000; // Token valid for 1 hour

  // Store the token and expiration time in the database
  const query = 'UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE email = ?';
  db.query(query, [resetToken, resetTokenExpiration, email], async (err, results) => {
    if (err || results.affectedRows === 0) {
      req.flash('errorMessage', 'There was an error processing your request. Please try again.');
      return res.redirect('/forgot-password');
    }

    // Compose the reset URL (adjust for actual production URL if needed)
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    try {
      // Send the reset email
      await transport.sendMail({
        from: 'no-reply@example.com',
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click here to reset: ${resetUrl}`,
        html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset your password.</p>`
      });

      req.flash('successMessage', 'Password reset link has been sent to your email.');
    } catch (error) {
      console.error('Error sending email:', error);
      req.flash('errorMessage', 'There was an error sending the password reset email. Please try again.');
    }

    res.redirect('/forgot-password');
  });
});

module.exports = router;
