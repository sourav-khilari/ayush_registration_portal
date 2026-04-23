import nodeMailer from "nodemailer"

export const sendEmail=async({email,subject,message,html,attachments})=>{
    // Use DEFAULT_NOTIFICATION_EMAIL only when explicitly requested for testing.
    const forcedTo = process.env.FORCE_DEFAULT_NOTIFICATION_EMAIL === "true"
      ? (process.env.DEFAULT_NOTIFICATION_EMAIL || "anishpanj026@gmail.com")
      : email;

    const transporter=nodeMailer.createTransport({
        host:process.env.SMTP_HOST,
        port:process.env.SMTP_PORT,
        service:process.env.SMTP_SERVICE,
        secure:true,
        auth:{
            user:process.env.SMTP_MAIL,
            pass:process.env.SMTP_PASSWORD
        },
    });

    console.log("\n\n"+process.env.SMTP_MAIL, process.env.SMTP_PASSWORD+"\n\n");

    
    const options={
        from:process.env.SMTP_MAIL,
        to:forcedTo,
        subject:subject,
        // prefer html when provided, fall back to text
        text: message && !html ? message : (typeof message === 'string' ? message.replace(/<[^>]*>/g, '') : undefined),
        html: html || undefined,
        attachments: Array.isArray(attachments) ? attachments : undefined,
    }

    await transporter.sendMail(options);
}