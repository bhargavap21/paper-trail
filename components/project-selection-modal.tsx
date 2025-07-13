"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Brain, Plus, FolderOpen, Calendar, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface ProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelected: (projectId: string) => void;
}

export default function ProjectSelectionModal({ 
  isOpen, 
  onClose, 
  onProjectSelected 
}: ProjectSelectionModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  
  const { toast } = useToast();

  // Fetch projects when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 [PROJECT MODAL] Modal opened, fetching projects...');
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: 'Error',
        description: 'Project name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const data = await response.json();
      const newProject = data.project;

      // Add to projects list
      setProjects(prev => [newProject, ...prev]);
      
      // Reset form
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);

      toast({
        title: 'Success',
        description: `Project "${newProject.name}" created successfully`,
      });

      // Auto-select the new project
      console.log('🎯 [PROJECT MODAL] Auto-selecting new project:', newProject.id);
      console.log('🎯 [PROJECT MODAL] New project details:', newProject);
      console.log('🎯 [PROJECT MODAL] Calling onProjectSelected with new project ID...');
      onProjectSelected(newProject.id);
      console.log('🎯 [PROJECT MODAL] Closing modal after project creation...');
      onClose();

    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    console.log('🎯 [PROJECT MODAL] Existing project selected:', projectId);
    console.log('🎯 [PROJECT MODAL] Available projects:', projects.map(p => ({ id: p.id, name: p.name })));
    console.log('🎯 [PROJECT MODAL] Calling onProjectSelected callback...');
    onProjectSelected(projectId);
    console.log('🎯 [PROJECT MODAL] Calling onClose callback...');
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-royal-500" />
            Select Memory Project
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-royal-500" />
              <span className="ml-2 text-gray-600">Loading projects...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Create New Project Section */}
              {!showCreateForm ? (
                <Card className="border-dashed border-2 border-royal-200 hover:border-royal-400 transition-colors">
                  <CardContent className="flex items-center justify-center py-8">
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      variant="ghost"
                      className="flex items-center gap-2 text-royal-600 hover:text-royal-700"
                    >
                      <Plus className="h-5 w-5" />
                      Create New Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-royal-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Project</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Project Name *
                      </label>
                      <Input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g., Machine Learning Research, Climate Change Analysis..."
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Description (Optional)
                      </label>
                      <Textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Brief description of your research project..."
                        rows={3}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleCreateProject}
                        disabled={creating || !newProjectName.trim()}
                        className="bg-royal-500 hover:bg-royal-600 text-white"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          'Create Project'
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewProjectName('');
                          setNewProjectDescription('');
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Existing Projects */}
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
                  <p className="text-sm">
                    Create your first project to start organizing your memory clips.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                    Existing Projects ({projects.length})
                  </h3>
                  {projects.map((project) => (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-royal-300"
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {project.name}
                            </h4>
                            {project.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              Created {formatDate(project.createdAt)}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-4">
                            Select
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}