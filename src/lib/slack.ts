export async function sendSlackAlert(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error("No Slack webhook URL configured.");
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
      }),
    });
    console.log("Slack alert sent successfully");
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}

export function formatDowntimeAlert(
  endpointName: string,
  endpointUrl: string,
  downtimeMinutes: number,
  startTime: Date,
  statusCode?: number,
  errorMessage?: string
): string {
  const emoji = "🚨";
  const timestamp = startTime.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "long",
  });

  let message = `${emoji} *ALERT: Service Down*\n\n`;
  message += `*Service:* ${endpointName}\n`;
  message += `*URL:* ${endpointUrl}\n`;
  message += `*Status:* DOWN for ${downtimeMinutes} minutes\n`;
  message += `*Started:* ${timestamp} (IST)\n`;
  
  if (statusCode) {
    message += `*Status Code:* ${statusCode}\n`;
  }
  
  if (errorMessage) {
    message += `*Error:* ${errorMessage}\n`;
  }

  message += `\n_This service has been continuously down for ${downtimeMinutes} minutes._`;

  return message;
}

export function formatRecoveryAlert(
  endpointName: string,
  endpointUrl: string,
  downtimeDuration: number
): string {
  const emoji = "✅";
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "long",
  });

  let message = `${emoji} *Service Recovered*\n\n`;
  message += `*Service:* ${endpointName}\n`;
  message += `*URL:* ${endpointUrl}\n`;
  message += `*Status:* BACK ONLINE\n`;
  message += `*Recovered at:* ${timestamp} (IST)\n`;
  message += `*Total downtime:* ${downtimeDuration} minutes\n`;

  return message;
}
