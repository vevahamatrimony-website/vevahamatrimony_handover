const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'vevahamatrimonydb@gmail.com',
        pass: process.env.SMTP_PASS || 'pukarnpinerikljy'
    }
});

// POST /api/contact-message
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, memberId, member_id, subject, message } = req.body;
        const finalMemberId = (memberId || member_id || '').trim();
        
        if (!name || !email || !subject || !message || !finalMemberId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Validate Member ID against Supabase profiles table
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase config missing for contact validation');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }
        
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const { data: profile, error: dbError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('member_id', finalMemberId)
            .maybeSingle();

        if (dbError) {
            console.error('Database error verifying member ID:', dbError);
            return res.status(500).json({ success: false, message: 'Database error verifying member ID' });
        }

        if (!profile) {
            return res.status(400).json({ success: false, message: 'Invalid Member ID. Please check and enter a correct Member ID.' });
        }

        // Prepare the message data
        const messageData = {
            id: Date.now(),
            date: new Date().toISOString(),
            name,
            email,
            phone: phone || '',
            memberId: finalMemberId,
            subject,
            message
        };

        // 1. Save to local JSON file
        const dataFile = path.join(__dirname, '..', 'contact-messages.json');
        let messages = [];
        
        if (fs.existsSync(dataFile)) {
            const rawData = fs.readFileSync(dataFile, 'utf8');
            try {
                messages = JSON.parse(rawData);
            } catch (e) {
                messages = [];
            }
        }
        
        messages.push(messageData);
        fs.writeFileSync(dataFile, JSON.stringify(messages, null, 2), 'utf8');

        // 2. Send Email Notification via Nodemailer
        try {
            const mailOptions = {
                from: `"VevahaMatrimony Website" <${process.env.SMTP_USER || 'vevahamatrimonydb@gmail.com'}>`,
                to: process.env.SMTP_USER || 'vevahamatrimonydb@gmail.com', // Send to self
                replyTo: email, // If admin hits "reply", it goes to the customer
                subject: `New Contact Query: ${subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #ec4899; border-bottom: 2px solid #ec4899; padding-bottom: 10px;">New Contact Message Received</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Member ID:</strong> ${finalMemberId || 'Not provided'}</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <div style="background-color: #f9f9f9; border-left: 4px solid #ec4899; padding: 15px; margin-top: 20px; white-space: pre-wrap;">
                            <strong>Message:</strong><br><br>
                            ${message}
                        </div>
                        <p style="font-size: 12px; color: #777; margin-top: 30px;">This email was sent automatically from the VevahaMatrimony Contact Form.</p>
                    </div>
                `
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`✅ Contact email sent for query from ${name}`);
        } catch (emailError) {
            console.error('❌ Failed to send contact email:', emailError);
            // We still return success to the user because the message was saved locally
        }

        res.status(200).json({ success: true, message: 'Message received successfully' });
    } catch (error) {
        console.error('Error handling contact message:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
