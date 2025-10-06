import React, { useState } from 'react';

const ProjectForm = ({ state, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    siteEngineer: '',
    startDate: new Date().toISOString().split('T')[0],
    tentativeCompletion: '',
    projectValue: '',
    state: state,
    status: 'active'
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    
    if (!formData.siteEngineer.trim()) {
      newErrors.siteEngineer = 'Site engineer is required';
    }
    
    if (!formData.projectValue || parseFloat(formData.projectValue) <= 0) {
      newErrors.projectValue = 'Valid project value is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.tentativeCompletion) {
      newErrors.tentativeCompletion = 'Tentative completion date is required';
    } else if (new Date(formData.tentativeCompletion) <= new Date(formData.startDate)) {
      newErrors.tentativeCompletion = 'Completion date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        projectValue: parseFloat(formData.projectValue)
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const getMinCompletionDate = () => {
    if (formData.startDate) {
      const minDate = new Date(formData.startDate);
      minDate.setDate(minDate.getDate() + 1);
      return minDate.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Create New Project - {state}</h3>
          <button className="modal-close" onClick={onCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                className={`form-control ${errors.projectName ? 'error' : ''}`}
                placeholder="Enter project name"
              />
              {errors.projectName && <span className="error-text">{errors.projectName}</span>}
            </div>
            
            <div className="form-group">
              <label>Project Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="Describe the project scope and objectives"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Site Engineer *</label>
                <input
                  type="text"
                  name="siteEngineer"
                  value={formData.siteEngineer}
                  onChange={handleChange}
                  className={`form-control ${errors.siteEngineer ? 'error' : ''}`}
                  placeholder="Engineer's name"
                />
                {errors.siteEngineer && <span className="error-text">{errors.siteEngineer}</span>}
              </div>

              <div className="form-group">
                <label>Project Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`form-control ${errors.startDate ? 'error' : ''}`}
                />
                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
              </div>

              <div className="form-group">
                <label>Tentative Completion Date *</label>
                <input
                  type="date"
                  name="tentativeCompletion"
                  value={formData.tentativeCompletion}
                  onChange={handleChange}
                  min={getMinCompletionDate()}
                  className={`form-control ${errors.tentativeCompletion ? 'error' : ''}`}
                />
                {errors.tentativeCompletion && <span className="error-text">{errors.tentativeCompletion}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Project Value (INR) *</label>
              <input
                type="number"
                name="projectValue"
                value={formData.projectValue}
                onChange={handleChange}
                className={`form-control ${errors.projectValue ? 'error' : ''}`}
                placeholder="Enter project value in INR"
                step="1000"
                min="0"
              />
              {errors.projectValue && <span className="error-text">{errors.projectValue}</span>}
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              <i className="fas fa-times"></i> Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save"></i> Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;