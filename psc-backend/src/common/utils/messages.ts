export const OTP_MSG = "<h2>here's your otp</h2>";




export const createRequestEmailContent = (
    member: any,
    club: any,
    request: any,
  ): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
        .content { padding: 20px 0; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Visit Request</h2>
          <p><strong>Club:</strong> ${club.name}</p>
        </div>
        
        <div class="content">
          <p>Dear ${club.name} Team,</p>
          
          <p>A new visit request has been submitted. Please find the details below:</p>
          
          <div class="details">
            <h3>Request Details:</h3>
            <p><strong>Request ID:</strong> ${request.id}</p>
            <p><strong>Request Date:</strong> ${new Date(request.requestedDate).toLocaleDateString()}</p>
            
            <h3>Member Details:</h3>
            <p><strong>Name:</strong> ${member.Name}</p>
            <p><strong>Membership No:</strong> ${member.Membership_No}</p>
            <p><strong>Email:</strong> ${member.Email}</p>
            <p><strong>Contact No:</strong> ${member.Contact_No}</p>
          </div>
          
          <p>This email has been CC'd to the member and PSC Club for reference.</p>
          
          <p>Please review this request and take appropriate action.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply directly to this email.</p>
          <p>© ${new Date().getFullYear()} Club Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }
