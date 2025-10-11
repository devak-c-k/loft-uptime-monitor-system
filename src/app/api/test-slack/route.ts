import { NextResponse } from "next/server";
import { sendSlackAlert } from "@/lib/slack";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await sendSlackAlert(message);

    return NextResponse.json({
      success: true,
      message: "Slack alert sent successfully",
    });
  } catch (error) {
    console.error("Error sending test Slack alert:", error);
    return NextResponse.json(
      { error: "Failed to send Slack alert" },
      { status: 500 }
    );
  }
}
