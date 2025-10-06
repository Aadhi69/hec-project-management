import React, { useState } from 'react';
import ProjectForm from './ProjectForm';

const StateProjects = ({ 
  state, 
  projects, 
  onProjectSelect, 
  onBack, 
  onAddProject, 
  onDeleteProject,
  searchTerm,
  onSearchChange 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (completionDate) => {
    const today = new Date();
    const completion = new Date(completionDate);
    const diffTime = completion - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Sort and filter projects
  const processedProjects = projects
    .filter(project => {
      if (filterStatus === 'all') return true;
      return project.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.projectName.localeCompare(b.projectName);
        case 'value':
          return b.projectValue - a.projectValue;
        case 'date':
          return new Date(b.startDate) - new Date(a.startDate);
        case 'completion':
          return new Date(a.tentativeCompletion) - new Date(b.tentativeCompletion);
        default:
          return 0;
      }
    });

  const totalValue = processedProjects.reduce((sum, project) => sum + parseFloat(project.projectValue || 0), 0);
  const activeProjects = processedProjects.filter(p => p.status === 'active').length;

  return (
    <div className="state-projects">
      <div className="card">
        <div className="header-with-actions">
          <div>
            <button className="btn btn-secondary" onClick={onBack}>
              <i className="fas fa-arrow-left"></i> Back to States
            </button>
            <h2>{state} - Project Portfolio</h2>
            <p className="text-muted">
              {processedProjects.length} project{processedProjects.length !== 1 ? 's' : ''} found • 
              Total Value: {formatCurrency(totalValue)}
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            <i className="fas fa-plus"></i> Add New Project
          </button>
        </div>

        {/* Filters and Sort */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="form-control"
            >
              <option value="name">Project Name</option>
              <option value="value">Project Value</option>
              <option value="date">Start Date</option>
              <option value="completion">Completion Date</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-control"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>

        {processedProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="fas fa-inbox"></i>
            </div>
            <h3>No projects found</h3>
            <p>Get started by adding a new project to {state}</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              <i className="fas fa-plus"></i> Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-2">
            {processedProjects.map(project => {
              const daysRemaining = getDaysRemaining(project.tentativeCompletion);
              const isOverdue = daysRemaining < 0;
              
              return (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => onProjectSelect(project)}
                >
                  <div className="project-actions">
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      title="Delete Project"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>

                  <div className="project-header">
                    <div>
                      <h3>{project.projectName}</h3>
                      <span className={`project-status-badge status-${project.status || 'active'}`}>
                        {project.status || 'active'}
                      </span>
                    </div>
                    <span className="project-value">
                      {formatCurrency(project.projectValue)}
                    </span>
                  </div>
                  
                  <p className="project-description">{project.description}</p>
                  
                  <div className="project-details">
                    <div className="detail-item">
                      <strong><i className="fas fa-user-hard-hat"></i> Site Engineer:</strong>
                      <span>{project.siteEngineer}</span>
                    </div>
                    <div className="detail-item">
                      <strong><i className="fas fa-calendar-plus"></i> Start Date:</strong>
                      <span>{formatDate(project.startDate)}</span>
                    </div>
                    <div className="detail-item">
                      <strong><i className="fas fa-flag-checkered"></i> Tentative Completion:</strong>
                      <span>
                        {formatDate(project.tentativeCompletion)}
                        {isOverdue ? (
                          <span style={{color: 'var(--error)', marginLeft: '0.5rem'}}>
                            <i className="fas fa-exclamation-triangle"></i> Overdue
                          </span>
                        ) : (
                          <span style={{color: 'var(--success)', marginLeft: '0.5rem'}}>
                            ({daysRemaining} days left)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="project-stats">
                    <div className="stat">
                      <span className="stat-number">{project.labours?.length || 0}</span>
                      <span className="stat-label">Labour Entries</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{project.materials?.length || 0}</span>
                      <span className="stat-label">Materials</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">
                        {project.labours?.reduce((sum, labour) => sum + (labour.numberOfLabours || 0), 0) || 0}
                      </span>
                      <span className="stat-label">Total Labours</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddForm && (
        <ProjectForm
          state={state}
          onSave={(projectData) => {
            onAddProject(projectData);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

export default StateProjects;