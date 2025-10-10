import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkServiceStatus } from "@/lib/monitoring";

/**
 * GET /api/endpoints/[id]
 * Get a specific endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const endpoint = await prisma.endpoints.findUnique({
      where: { id },
      include: {
        checks: {
          orderBy: {
            checked_at: "desc",
          },
          take: 100,
        },
      },
    });

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ endpoint });
  } catch (error: any) {
    console.error("Error fetching endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/endpoints/[id]
 * Delete an endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.endpoints.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/endpoints/[id]
 * Update an endpoint
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, type } = body;

    // Validation
    if (!name && !url && !type) {
      return NextResponse.json(
        { error: "At least one field (name, url, or type) is required" },
        { status: 400 }
      );
    }

    // Validate URL format if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }

      // Check if new URL already exists (but not for this endpoint)
      const existingUrl = await prisma.endpoints.findFirst({
        where: { 
          url,
          NOT: { id }
        },
      });

      if (existingUrl) {
        return NextResponse.json(
          { error: "This URL is already being monitored" },
          { status: 409 }
        );
      }
    }

    // Check if new name already exists (but not for this endpoint)
    if (name) {
      const existingName = await prisma.endpoints.findFirst({
        where: { 
          name,
          NOT: { id }
        },
      });

      if (existingName) {
        return NextResponse.json(
          { error: "An endpoint with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update the endpoint
    const endpoint = await prisma.endpoints.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(type && { type }),
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

    return NextResponse.json({ 
      success: true,
      endpoint: transformedEndpoint 
    });
  } catch (error: any) {
    console.error("Error updating endpoint:", error);
    
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
      { error: "Failed to update endpoint" },
      { status: 500 }
    );
  }
}
