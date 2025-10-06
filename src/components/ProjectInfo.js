import React, { useState } from 'react';

const ProjectInfo = ({ project, onUpdateProject }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(project);

  const handleSave = () => {
    onUpdateProject({
      ...formData,
      projectValue: parseFloat(formData.projectValue)
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(project);
    setIsEditing(false);
  };

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
      month: 'long',
      day: 'numeric'
    });
  };

  const getProgress = () => {
    const start = new Date(project.startDate);
    const end = new Date(project.tentativeCompletion);
    const today = new Date();
    const total = end - start;
    const elapsed = today - start;
    return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
  };

  const progress = getProgress();

  return (
    <div className="project-info">
      <div className="section-header">
        <h3>Project Overview</h3>
        <div className="header-actions">
          {!isEditing ? (
            <button
              className="btn btn-secondary"
              onClick={() => setIsEditing(true)}
            >
              <i className="fas fa-edit"></i> Edit Info
            </button>
          ) : (
            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={handleCancel}>
                <i className="fas fa-times"></i> Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <i className="fas fa-save"></i> Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="info-grid">
          <div className="info-item">
            <label>Project Name</label>
            <span>{project.projectName}</span>
          </div>
          <div className="info-item">
            <label>Project Value</label>
            <span>{formatCurrency(project.projectValue)}</span>
          </div>
          <div className="info-item">
            <label>Site Engineer</label>
            <span>{project.siteEngineer}</span>
          </div>
          <div className="info-item">
            <label>Start Date</label>
            <span>{formatDate(project.startDate)}</span>
          </div>
          <div className="info-item">
            <label>Tentative Completion</label>
            <span>{formatDate(project.tentativeCompletion)}</span>
          </div>
          <div className="info-item">
            <label>Project Status</label>
            <span className={`project-status-badge status-${project.status || 'active'}`}>
              {project.status || 'active'}
            </span>
          </div>
          <div className="info-item full-width">
            <label>Project Description</label>
            <span>{project.description || 'No description provided'}</span>
          </div>
          <div className="info-item full-width">
            <label>Project Progress</label>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span style={{ marginLeft: '1rem', color: 'var(--light-blue)' }}>
                {progress}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="info-grid">
          <div className="info-item">
            <label>Project Name</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="info-item">
            <label>Project Value</label>
            <input
              type="number"
              value={formData.projectValue}
              onChange={(e) => setFormData({ ...formData, projectValue: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="info-item">
            <label>Site Engineer</label>
            <input
              type="text"
              value={formData.siteEngineer}
              onChange={(e) => setFormData({ ...formData, siteEngineer: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="info-item">
            <label>Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="info-item">
            <label>Tentative Completion</label>
            <input
              type="date"
              value={formData.tentativeCompletion}
              onChange={(e) => setFormData({ ...formData, tentativeCompletion: e.target.value })}
              className="form-control"
            />
          </div>
          <div className="info-item">
            <label>Project Status</label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="form-control"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
          <div className="info-item full-width">
            <label>Project Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-control"
              rows="4"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectInfo;