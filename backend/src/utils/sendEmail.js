import nodeMailer from "nodemailer"

export const sendEmail=async({email,subject,message,html})=>{
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
        to:email,
        subject:subject,
        // prefer html when provided, fall back to text
        text: message && !html ? message : (typeof message === 'string' ? message.replace(/<[^>]*>/g, '') : undefined),
        html: html || undefined,
    }

    await transporter.sendMail(options);
}