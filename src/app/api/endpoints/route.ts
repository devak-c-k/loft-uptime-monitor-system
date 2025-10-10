import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkServiceStatus } from "@/lib/monitoring";

/**
 * POST /api/endpoints
 * Add a new endpoint to monitor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type } = body;

    // Validation
    if (!name || !url || !type) {
      return NextResponse.json(
        { error: "Name, URL, and type are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existingName = await prisma.endpoints.findFirst({
      where: { name },
    });

    if (existingName) {
      return NextResponse.json(
        { error: "An endpoint with this name already exists" },
        { status: 409 }
      );
    }

    // Check if URL already exists
    const existingUrl = await prisma.endpoints.findUnique({
      where: { url },
    });

    if (existingUrl) {
      return NextResponse.json(
        { error: "This URL is already being monitored" },
        { status: 409 }
      );
    }

    // Create the endpoint
    const endpoint = await prisma.endpoints.create({
      data: {
        name,
        url,
        type,
      },
    });

    // Perform an initial check
    const initialCheck = await checkServiceStatus(url);
    await prisma.checks.create({
      data: {
        endpoint_id: endpoint.id,
        status: initialCheck.status,
        http_code: initialCheck.httpCode,
        response_time: initialCheck.responseTime,
        error_message: initialCheck.errorMessage,
      },
    });

    // Transform snake_case to camelCase for frontend
    const transformedEndpoint = {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      type: endpoint.type,
      createdAt: endpoint.created_at.toISOString(),
      updatedAt: endpoint.updated_at.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        endpoint: transformedEndpoint,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating endpoint:", error);
    
    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'name') {
        return NextResponse.json(
          { error: "An endpoint with this name already exists" },
          { status: 409 }
        );
      } else if (field === 'url') {
        return NextResponse.json(
          { error: "This URL is already being monitored" },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create endpoint" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/endpoints
 * Get all monitored endpoints
 * Public endpoint - no authentication required
 */
export async function GET() {
  try {
    const endpoints = await prisma.endpoints.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    
    const transformedEndpoints = endpoints.map((endpoint) => ({
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      type: endpoint.type,
      createdAt: endpoint.created_at.toISOString(),
      updatedAt: endpoint.updated_at.toISOString(),
    }));

    return NextResponse.json({ endpoints: transformedEndpoints });
  } catch (error: any) {
    console.error("Error fetching endpoints:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
