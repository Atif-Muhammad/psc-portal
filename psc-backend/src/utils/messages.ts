export const OTP_MSG = `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; line-height: 1.6;">
<tr>
<td>

<p><strong>Dear Mr. {{memberName}}</strong></p>

<p>
We are pleased to inform you that a unique One-Time PIN has been generated for your login to the Peshawar Services Club Mobile App.
</p>

<p>
  <strong>Your Login PIN:</strong>
</p>
<div style="
  background-color: #f8f9fa;
  border: 2px dashed #2b3a55;
  color: #2b3a55;
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 5px;
  padding: 15px;
  text-align: center;
  border-radius: 8px;
  margin: 20px 0;
  display: inline-block;
  min-width: 150px;
">
  {{pinCode}}
</div>

<p><strong>Please note the following important instructions:</strong></p>

<ul>
<li>This PIN is for one-time use only and is required to complete your login.</li>
<li>The PIN is valid for one hour only. Once expired, you are requested to generate a new PIN via the mobile app.</li>
<li>Do not share this PIN with anyone under any circumstances.</li>
<li>For your security, please log out of the app before selling, changing, or handing over your mobile phone.</li>
<li>PSC will not be responsible for any misuse of the app resulting from sharing your PIN or negligence.</li>
<li>The PSC Mobile App includes features with financial implications. Any request, transaction, or activity made through your account will be considered your responsibility.</li>
<li>If you did not request this PIN or notice any suspicious activity, please contact the PSC Main Office immediately.</li>
</ul>

<p>
Thank you for your cooperation in helping us maintain the security of our digital services.
</p>

<p>
Warm regards,<br><br>
Management<br>
Peshawar Services Club<br>
091-9212753-4
</p>

<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
  <p>This is an automated message. Please do not reply directly to this email.</p>
  <p>© ${new Date().getFullYear()} Peshawar Services Club</p>
</div>

<div style="display: none; visibility: hidden; opacity: 0; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; overflow: hidden;">
  Reference ID: {{timestamp}}
</div>

</td>
</tr>
</table>
`;

export const createRequestEmailContent = (
  member: any,
  club: any,
  request: any,
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Introductory Letter</title>
      <style>
        body {
          font-family: "Georgia", serif;
          background: #f2f2f2;
          margin: 0;
          padding: 40px;
        }
        .letter-container {
          background: #ffffff;
          max-width: 800px;
          margin: auto;
          padding: 60px 50px;
          text-align: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .logo { width: 180px; margin-bottom: 20px; }
        h1 { font-style: italic; text-decoration: underline; font-size: 22px; margin-bottom: 30px; }
        .meta { text-align: left; font-size: 14px; margin-bottom: 30px; }
        .meta strong { font-weight: bold; }
        .content { font-size: 20px; line-height: 1.6; margin: 30px 0; }
        .content strong { font-weight: bold; }
        .footer { margin-top: 40px; font-size: 20px; }
        .signature { margin-top: 30px; font-weight: bold; font-size: 22px; }
        .club-name { font-size: 20px; margin-top: 5px; }
        .phone { margin-top: 5px; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="letter-container">
        <img src="https://res.cloudinary.com/dtqdpntlc/image/upload/v1772616023/logo_rghsf6.png" class="logo" alt="Club Logo" />

        <h1>INTRODUCTORY LETTER</h1>

        <div class="meta">
          <div><strong>Serial No:</strong> ${request.id}</div>
          <div><strong>Date:</strong> ${new Date(request.createdAt ?? Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>

        <div class="content">
          I have the honor to introduce
          <strong>Mr. ${member.Name}</strong> with family,
          Membership No. <strong>${member.Membership_No}</strong>,
          a bonafide Member of Peshawar Services Club,
          who will be visiting <strong>${club.name}</strong>
          on <strong>${new Date(request.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
          <br /><br />
          Thank you for your kind cooperation!
        </div>

        <div class="footer">Best Regards,</div>
        <div class="signature">Secretary</div>
        <div class="club-name">Peshawar Services Club</div>
        <div class="phone">091-9212753-5</div>
      </div>
    </body>
    </html>
  `;
}

export const sendMailMemberAff = (
  status: 'APPROVED' | 'REJECTED',
  member: any,
  club: any,
  purpose: string,
  requestId: number,
  reqDate: string,
) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">${club?.name} Visit Request – ${status} (Request ID: ${requestId})</h2>

      <p>Dear ${member?.name || 'Member'},</p>

      ${status === 'APPROVED'
      ? `<p>
        Your request to visit <strong>${club?.name}</strong> has been successfully received and Accepted.
      </p>`
      : `<p>
        Your request to visit <strong>${club?.name}</strong> has been Rejected.
      </p>`
    }

      <h3 style="margin-top: 20px;">Request Details</h3>
      <ul>
        <li><strong>Request ID:</strong> ${requestId}</li>
        <li><strong>Request Date:</strong> ${reqDate}</li>
        <li><strong>Club:</strong> ${club?.name}</li>
        <li><strong>Purpose of Visit:</strong> ${purpose}</li>
      </ul>

      <p>
        The respective club will review your request and will contact you shortly via 
        <strong>email</strong> or <strong>phone call</strong> with further instructions and confirmation 
        of your visit schedule.
      </p>

      <p>Thank you for your patience.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
};

export const sendMailClubAff = (
  member: any,
  club: any,
  purpose: string,
  requestId: number,
  visitDate: string,
) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">Club Visit Request (ID: ${requestId})</h2>

      <p>Dear ${club?.name},</p>

      <p>
        A member from our club has requested to visit your facility.
      </p>

      <h3 style="margin-top: 20px;">Member Details</h3>
      <ul>
        <li><strong>Name:</strong> ${member?.Name}</li>
        <li><strong>Membership No:</strong> ${member?.Membership_No}</li>
        <li><strong>Contact:</strong> ${member?.Email || ''} ${member?.Contact_No ? ' / ' + member.Contact_No : ''}</li>
      </ul>

      <h3 style="margin-top: 20px;">Visit Request Details</h3>
      <ul>
        <li><strong>Request ID:</strong> ${requestId}</li>
        <li><strong>Requested Club:</strong> ${club?.name}</li>
        <li><strong>Purpose of Visit:</strong> ${purpose}</li>
        <li><strong>Expected Visit Date:</strong> ${visitDate}</li>
      </ul>

      <p>
        Please review the request and contact the member if any additional information is required.
        You may reach out to the member directly using the details provided above.
      </p>

      <p>Thank you.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
};


export const confirmations = {

  roomBookingConfirmation: (member: any, room: any, booking: any) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">Room Booking Confirmation (ID: ${booking.id})</h2>

      <p>Dear ${member?.name || 'Member'},</p>

      <p>
        Your room booking has been successfully confirmed.
      </p>

      <h3 style="margin-top: 20px;">Booking Details</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.id}</li>
        <li><strong>Room:</strong> ${room?.name}</li>
        <li><strong>Check-in:</strong> ${booking.checkInDate}</li>
        <li><strong>Check-out:</strong> ${booking.checkOutDate}</li>
        <li><strong>Total Amount:</strong> ${booking.totalAmount}</li>
      </ul>

      <p>
        Please review the booking details and contact the club if any additional information is required.
      </p>

      <p>Thank you.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
  },
  hallbookingConfirmation: (member: any, hall: any, booking: any) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">Hall Booking Confirmation (ID: ${booking.id})</h2>

      <p>Dear ${member?.name || 'Member'},</p>

      <p>
        Your hall booking has been successfully confirmed.
      </p>

      <h3 style="margin-top: 20px;">Booking Details</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.id}</li>
        <li><strong>Hall:</strong> ${hall?.name}</li>
        <li><strong>Check-in:</strong> ${booking.checkInDate}</li>
        <li><strong>Check-out:</strong> ${booking.checkOutDate}</li>
        <li><strong>Total Amount:</strong> ${booking.totalAmount}</li>
      </ul>

      <p>
        Please review the booking details and contact the club if any additional information is required.
      </p>

      <p>Thank you.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
  },
  lawnbookingConfirmation: (member: any, lawn: any, booking: any) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">Lawn Booking Confirmation (ID: ${booking.id})</h2>

      <p>Dear ${member?.name || 'Member'},</p>

      <p>
        Your lawn booking has been successfully confirmed.
      </p>

      <h3 style="margin-top: 20px;">Booking Details</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.id}</li>
        <li><strong>Lawn:</strong> ${lawn?.name}</li>
        <li><strong>Check-in:</strong> ${booking.checkInDate}</li>
        <li><strong>Check-out:</strong> ${booking.checkOutDate}</li>
        <li><strong>Total Amount:</strong> ${booking.totalAmount}</li>
      </ul>

      <p>
        Please review the booking details and contact the club if any additional information is required.
      </p>

      <p>Thank you.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
  },
  photoshootBookingConfirmation: (member: any, photoshoot: any, booking: any) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">Photoshoot Booking Confirmation (ID: ${booking.id})</h2>

      <p>Dear ${member?.name || 'Member'},</p>

      <p>
        Your photoshoot booking has been successfully confirmed.
      </p>

      <h3 style="margin-top: 20px;">Booking Details</h3>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.id}</li>
        <li><strong>Photoshoot:</strong> ${photoshoot?.name}</li>
        <li><strong>Check-in:</strong> ${booking.checkInDate}</li>
        <li><strong>Check-out:</strong> ${booking.checkOutDate}</li>
        <li><strong>Total Amount:</strong> ${booking.totalAmount}</li>
      </ul>

      <p>
        Please review the booking details and contact the club if any additional information is required.
      </p>

      <p>Thank you.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
  },

  paymentConfirmation: ()=>{

  },

  cancellationAccept: ()=>{

  },
  cancellationReject: ()=>{

  },

  feedbackCreated: (member: any, feedback: any)=>{
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2b3a55;">Feedback Created (ID: ${feedback.id})</h2>

      <p>Dear ${member?.name || 'Member'},</p>

      <p>
        Your feedback has been successfully created.
      </p>

      <h3 style="margin-top: 20px;">Feedback Details</h3>
      <ul>
        <li><strong>Feedback ID:</strong> ${feedback.id}</li>
        <li><strong>Feedback:</strong> ${feedback.feedback}</li>
        <li><strong>Feedback Date:</strong> ${feedback.feedbackDate}</li>
      </ul>

      <p>
        Please review the feedback details and contact the club if any additional information is required.
      </p>

      <p>Thank you.<br/>
      <strong>Peshawar Services Club</strong></p>
    </div>
  `;
  },
  feedbackAck:()=>{

  },
  

}