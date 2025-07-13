import { NextResponse } from 'next/server';
import { mockDb } from '../memory/db';

export async function GET(req: Request) {
  try {
    // Use a mock/default userId instead of requiring authentication
    const userId = "demo-user";

    const projects = mockDb.listProjects({ userId });
    
    console.log(`Retrieved ${projects.length} projects for user ${userId}`);

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    console.error('[PROJECTS_GET]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Use a mock/default userId instead of requiring authentication
    const userId = "demo-user";
    
    const body = await req.json();
    const { name, description } = body;

    if (!name || name.trim().length === 0) {
      return new NextResponse('Project name is required', { status: 400 });
    }

    // Check if project name already exists for this user
    const existingProjects = mockDb.listProjects({ userId });
    const duplicateProject = existingProjects.find(project => 
      project.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    
    if (duplicateProject) {
      return new NextResponse('Project name already exists', { status: 409 });
    }

    const project = mockDb.createProject({
      name: name.trim(),
      description: description?.trim() || '',
      userId
    });

    console.log(`Created new project: ${project.id} - ${project.name}`);

    return NextResponse.json({ project }, { status: 201 });

  } catch (error: any) {
    console.error('[PROJECTS_POST]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}