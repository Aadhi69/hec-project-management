import React, { useState } from 'react';
import LabourManagement from './LabourManagement';
import MaterialManagement from './MaterialManagement';
import ProjectInfo from './ProjectInfo';
import Analytics from './Analytics';

const ProjectDetail = ({ project, onBack, onUpdateProject, onDeleteProject }) => {
  const [activeTab, setActiveTab] = useState('labours');

  const updateProjectData = (updatedData) => {
    onUpdateProject({ ...project, ...updatedData });
  };

  const handleDeleteProject = () => {
    if (window.confirm(`Are you sure you want to delete "${project.projectName}"? This action cannot be undone.`)) {
      onDeleteProject(project.id);
    }
  };

  const tabs = [
    { id: 'labours', label: 'Labours Management', icon: 'fas fa-hard-hat' },
    { id: 'materials', label: 'Materials Management', icon: 'fas fa-tools' },
    { id: 'analytics', label: 'Project Analytics', icon: 'fas fa-chart-bar' },
    { id: 'info', label: 'Project Info', icon: 'fas fa-info-circle' }
  ];

  return (
    <div className="project-detail">
      <div className="card">
        <div className="project-header">
          <button className="btn btn-secondary" onClick={onBack}>
            <i className="fas fa-arrow-left"></i> Back to Projects
          </button>
          <div className="project-title">
            <div>
              <h2>{project.projectName}</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="project-state-badge">
                  <i className="fas fa-map-marker-alt"></i> {project.state}
                </span>
                <span className={`project-status-badge status-${project.status || 'active'}`}>
                  <i className="fas fa-circle"></i> {project.status || 'active'}
                </span>
                <button 
                  className="btn btn-danger"
                  onClick={handleDeleteProject}
                  style={{ marginLeft: 'auto' }}
                >
                  <i className="fas fa-trash"></i> Delete Project
                </button>
              </div>
            </div>
          </div>
          <p className="project-description">{project.description}</p>
        </div>

        <ProjectInfo project={project} onUpdateProject={updateProjectData} />

        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={tab.icon}></i> {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'labours' && (
            <LabourManagement
              labours={project.labours || []}
              onUpdateLabours={(labours) => updateProjectData({ labours })}
            />
          )}
          {activeTab === 'materials' && (
            <MaterialManagement
              materials={project.materials || []}
              onUpdateMaterials={(materials) => updateProjectData({ materials })}
            />
          )}
          {activeTab === 'analytics' && (
            <Analytics project={project} />
          )}
          {activeTab === 'info' && (
            <div className="project-info-detail">
              <h3>Project Information</h3>
              <p>Use the project info section above to edit project details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;