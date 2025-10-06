import React from 'react';

const Analytics = ({ project }) => {
  const totalLabourCost = project.labours?.reduce((sum, labour) => sum + (labour.wages || 0), 0) || 0;
  const totalMaterialCost = project.materials?.reduce((sum, material) => sum + (material.cost || 0), 0) || 0;
  const totalProjectCost = totalLabourCost + totalMaterialCost;
  
  const totalLabours = project.labours?.reduce((sum, labour) => sum + labour.numberOfLabours, 0) || 0;
  const totalMaterials = project.materials?.length || 0;

  const labourByRole = project.labours?.reduce((acc, labour) => {
    const role = labour.role || 'Unknown';
    if (!acc[role]) {
      acc[role] = { count: 0, cost: 0 };
    }
    acc[role].count += labour.numberOfLabours;
    acc[role].cost += labour.wages || 0;
    return acc;
  }, {}) || {};

  const materialsByCategory = project.materials?.reduce((acc, material) => {
    const category = material.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { count: 0, cost: 0 };
    }
    acc[category].count += 1;
    acc[category].cost += material.cost || 0;
    return acc;
  }, {}) || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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

  const getDaysRemaining = () => {
    const today = new Date();
    const completion = new Date(project.tentativeCompletion);
    const diffTime = completion - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="analytics">
      <h3>Project Analytics & Insights</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Financial Overview</h4>
          <div className="stat-card">
            <span className="stat-number">{formatCurrency(totalProjectCost)}</span>
            <span className="stat-label">Total Spent</span>
          </div>
          <div className="cost-breakdown">
            <div className="cost-item">
              <span>Labour Cost:</span>
              <strong>{formatCurrency(totalLabourCost)}</strong>
            </div>
            <div className="cost-item">
              <span>Material Cost:</span>
              <strong>{formatCurrency(totalMaterialCost)}</strong>
            </div>
            <div className="cost-item total">
              <span>Remaining Budget:</span>
              <strong>{formatCurrency(Math.max(0, project.projectValue - totalProjectCost))}</strong>
            </div>
            <div className="cost-item">
              <span>Budget Utilization:</span>
              <strong>{((totalProjectCost / project.projectValue) * 100).toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h4>Resource Summary</h4>
          <div className="stat-card">
            <span className="stat-number">{totalLabours}</span>
            <span className="stat-label">Total Labours</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{totalMaterials}</span>
            <span className="stat-label">Material Types</span>
          </div>
          <div className="progress-container">
            <label>Project Progress</label>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span style={{ textAlign: 'center', color: 'var(--light-blue)', marginTop: '0.5rem' }}>
              {progress}% Complete
            </span>
          </div>
        </div>

        <div className="analytics-card">
          <h4>Labour Distribution</h4>
          {Object.keys(labourByRole).length > 0 ? (
            <div className="distribution-list">
              {Object.entries(labourByRole)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([role, data]) => (
                  <div key={role} className="distribution-item">
                    <div className="distribution-header">
                      <span>{role}</span>
                      <span>{data.count} labours</span>
                    </div>
                    <div className="distribution-cost">
                      {formatCurrency(data.cost)}
                    </div>
                  </div>
                ))
              }
            </div>
          ) : (
            <p className="text-muted">No labour data available</p>
          )}
        </div>

        <div className="analytics-card">
          <h4>Material Spending</h4>
          {Object.keys(materialsByCategory).length > 0 ? (
            <div className="distribution-list">
              {Object.entries(materialsByCategory)
                .sort((a, b) => b[1].cost - a[1].cost)
                .map(([category, data]) => (
                  <div key={category} className="distribution-item">
                    <div className="distribution-header">
                      <span>{category}</span>
                      <span>{data.count} items</span>
                    </div>
                    <div className="distribution-cost">
                      {formatCurrency(data.cost)}
                    </div>
                    <div className="distribution-percentage">
                      {((data.cost / totalMaterialCost) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))
              }
            </div>
          ) : (
            <p className="text-muted">No material data available</p>
          )}
        </div>
      </div>

      <div className="card">
        <h4>Project Timeline & Status</h4>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-marker start"></div>
            <div className="timeline-content">
              <h5>Project Start</h5>
              <p>{new Date(project.startDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
          
          <div className="timeline-item current">
            <div className="timeline-marker current"></div>
            <div className="timeline-content">
              <h5>Current Status</h5>
              <p>
                <span className={`project-status-badge status-${project.status || 'active'}`}>
                  {project.status || 'active'}
                </span>
              </p>
              <p>{progress}% completed</p>
              <p>{daysRemaining > 0 ? `${daysRemaining} days remaining` : `${Math.abs(daysRemaining)} days overdue`}</p>
            </div>
          </div>
          
          <div className="timeline-item">
            <div className="timeline-marker end"></div>
            <div className="timeline-content">
              <h5>Tentative Completion</h5>
              <p>{new Date(project.tentativeCompletion).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h4>Quick Actions</h4>
        <div className="action-buttons">
          <button className="btn btn-primary">
            <i className="fas fa-file-pdf"></i> Generate Report
          </button>
          <button className="btn btn-secondary">
            <i className="fas fa-chart-line"></i> Export Data
          </button>
          <button className="btn btn-success">
            <i className="fas fa-sync"></i> Update Progress
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;