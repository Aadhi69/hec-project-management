/* App.js - UI TEST: Structural and Utility Updates */
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { database } from './firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePWA } from './hooks/usePWA';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isInstallable, installApp } = usePWA();

  const states = [
    'Tamil Nadu', 'Delhi', 'Uttar Pradesh'
  ];

  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2);

  const loadProjectsFromFirebase = useCallback(async () => {
    try {
      setLoading(true);
      const projectsData = await database.getProjects();
      // Ensure all loaded projects have 'percentageComplete' initialized
      const safeProjects = projectsData.map(p => ({
          ...p,
          percentageComplete: p.percentageComplete || 0 
      }));
      setProjects(safeProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      const savedProjects = localStorage.getItem('hec-projects');
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects).map(p => ({
            ...p,
            percentageComplete: p.percentageComplete || 0 
        }));
        setProjects(parsedProjects);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectsFromFirebase();
  }, [loadProjectsFromFirebase]);

  const handleStateSelect = useCallback((state) => {
    setSelectedState(state);
    setCurrentView('projects');
  }, []);

  const handleProjectSelect = useCallback((project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  }, []);

  const addProject = useCallback(async (newProject) => {
    const project = {
      ...newProject,
      id: generateUniqueId(),
      labours: [],
      materials: [],
      createdAt: new Date().toISOString(),
      projectValue: parseFloat(newProject.projectValue),
      percentageComplete: 0 // Initialize new project progress
    };
    
    try {
      await database.saveProject(project);
      setProjects(prev => [...prev, project]);
      
      const updatedProjects = [...projects, project];
      localStorage.setItem('hec-projects', JSON.stringify(updatedProjects));
    } catch (error) {
      console.error('Error saving project:', error);
      setProjects(prev => [...prev, project]);
      localStorage.setItem('hec-projects', JSON.stringify([...projects, project]));
    }
  }, [projects]);

  const updateProject = useCallback(async (updatedProject) => {
    try {
      await database.saveProject(updatedProject);
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));
      
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      
      localStorage.setItem('hec-projects', JSON.stringify(
        projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      ));
    } catch (error) {
      console.error('Error updating project:', error);
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      localStorage.setItem('hec-projects', JSON.stringify(
        projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      ));
    }
  }, [projects, selectedProject]);

  const deleteProject = useCallback(async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await database.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        localStorage.setItem('hec-projects', JSON.stringify(
          projects.filter(p => p.id !== projectId)
        ));
        
        if (selectedProject && selectedProject.id === projectId) {
          setCurrentView('projects');
          setSelectedProject(null);
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        localStorage.setItem('hec-projects', JSON.stringify(
          projects.filter(p => p.id !== projectId)
        ));
        if (selectedProject && selectedProject.id === projectId) {
          setCurrentView('projects');
          setSelectedProject(null);
        }
      }
    }
  }, [projects, selectedProject]);

  // Export to Excel function (unchanged)
  const exportToExcel = async () => {
    try {
      const allProjects = projects.length > 0 ? projects : await database.getProjects();
      
      if (allProjects.length === 0) {
        alert('No data available to export.');
        return;
      }

      const wb = XLSX.utils.book_new();
      
      const projectsData = allProjects.map(project => ({
        'Project ID': project.id,
        'Project Name': project.projectName,
        'Description': project.description,
        'State': project.state,
        'Site Engineer': project.siteEngineer,
        'Progress (%)': project.percentageComplete || 0, // Export Progress
        'Start Date': new Date(project.startDate).toLocaleDateString(),
        'Completion Date': project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'N/A',
        'Project Value (₹)': project.projectValue,
        'Total Labour Entries': project.labours?.length || 0,
        'Total Material Entries': project.materials?.length || 0,
        'Created Date': new Date(project.createdAt).toLocaleDateString()
      }));

      const laboursData = allProjects.flatMap(project => 
        (project.labours || []).map(labour => ({
          'Project ID': project.id,
          'Project Name': project.projectName,
          'State': project.state,
          'Date': new Date(labour.date).toLocaleDateString(),
          'Number of Labours': labour.numberOfLabours,
          'Daily Salary (₹)': labour.dailySalary || 0,
          'Total Daily Salary (₹)': (labour.dailySalary || 0) * labour.numberOfLabours,
          'Work Description': labour.workDescription
        }))
      );

      const materialsData = allProjects.flatMap(project => 
        (project.materials || []).map(material => ({
          'Project ID': project.id,
          'Project Name': project.projectName,
          'State': project.state,
          'Material Name': material.materialName,
          'Unit Cost (₹)': material.cost || 0,
          'Quantity': material.quantity,
          'Total Cost (₹)': (material.cost || 0) * material.quantity,
          'Purchase Date': new Date(material.dateOfPurchase).toLocaleDateString(),
          'Supplier': material.supplier
        }))
      );

      const projectsWs = XLSX.utils.json_to_sheet(projectsData);
      const laboursWs = XLSX.utils.json_to_sheet(laboursData);
      const materialsWs = XLSX.utils.json_to_sheet(materialsData);

      XLSX.utils.book_append_sheet(wb, projectsWs, 'Projects');
      if (laboursData.length > 0) {
        XLSX.utils.book_append_sheet(wb, laboursWs, 'Labours');
      }
      if (materialsData.length > 0) {
        XLSX.utils.book_append_sheet(wb, materialsWs, 'Materials');
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const fileName = `HEC_Projects_Export_${monthYear.replace(' ', '_')}.xlsx`;
      
      saveAs(data, fileName);
      
      alert(`Excel file "${fileName}" downloaded successfully!\n\nExported:\n- ${projectsData.length} projects\n- ${laboursData.length} labour entries\n- ${materialsData.length} material entries`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting data to Excel. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading HEC Project Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Hindustan Engineers and Contractors</h1>
          <p>Cloud Connected Project Management</p>
        </div>
      </header>

      {isInstallable && (
        <div className="pwa-install-prompt">
          <div className="pwa-prompt-content">
            <div className="pwa-prompt-info">
              <span className="pwa-icon">📱</span>
              <div>
                <h4>Install HEC App</h4>
                <p>Get the full app experience on your home screen</p>
              </div>
            </div>
            <div className="pwa-prompt-actions">
              <button className="pwa-cancel-btn" onClick={() => {}}>
                Later
              </button>
              <button className="pwa-install-btn" onClick={installApp}>
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            states={states} 
            onStateSelect={handleStateSelect}
            onExportToExcel={exportToExcel}
          />
        )}

        {currentView === 'projects' && (
          <ProjectList
            state={selectedState}
            projects={projects.filter(p => p.state === selectedState)}
            onProjectSelect={handleProjectSelect}
            onBack={() => setCurrentView('dashboard')}
            onAddProject={addProject}
            onDeleteProject={deleteProject}
          />
        )}

        {currentView === 'project-detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onBack={() => setCurrentView('projects')}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
          />
        )}
      </main>
    </div>
  );
}

// =================================================================================
// New Project Summary Component for Project Detail View
// =================================================================================

const ProjectSummary = React.memo(({ project }) => {
    // 1. Calculate Total Costs
    const totalLabourCost = (project.labours || []).reduce((sum, labour) => {
        return sum + (labour.numberOfLabours || 0) * (labour.dailySalary || 0);
    }, 0);

    const totalMaterialCost = (project.materials || []).reduce((sum, material) => {
        return sum + (material.quantity || 0) * (material.cost || 0);
    }, 0);

    const totalSpent = totalLabourCost + totalMaterialCost;
    const projectValue = project.projectValue || 0;
    const remainingBudget = projectValue - totalSpent;

    // 2. Format Currency
    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
    };
    
    // 3. Progress Bar Logic
    const progress = Math.min(100, Math.max(0, project.percentageComplete || 0));

    // 4. Budget Status for Visual Cue
    let budgetColor = 'green';
    if (totalSpent > (projectValue * 0.8)) {
        budgetColor = 'orange'; // Warning near 80%
    }
    if (totalSpent > projectValue) {
        budgetColor = 'red'; // Over budget
    }

    return (
        <div className="financial-summary">
            <h3>Project Status</h3>

            {/* Progress Bar */}
            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: '600' }}>
                    Completion: {progress}%
                </label>
                <div className="progress-container">
                    <div 
                        className="progress-bar" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Financial Grid */}
            <div className="summary-grid">
                <div className="summary-item">
                    <label>💰 Project Value</label>
                    <span>{formatCurrency(projectValue)}</span>
                </div>
                <div className="summary-item">
                    <label>🛠️ Total Labour Cost</label>
                    <span>{formatCurrency(totalLabourCost)}</span>
                </div>
                <div className="summary-item">
                    <label>🧱 Total Material Cost</label>
                    <span>{formatCurrency(totalMaterialCost)}</span>
                </div>
                <div className="summary-item">
                    <label style={{ color: budgetColor }}>📉 Remaining Budget</label>
                    <span style={{ color: budgetColor }}>{formatCurrency(remainingBudget)}</span>
                </div>
            </div>
        </div>
    );
});


// =================================================================================
// Existing Components with UI/UX Integration
// =================================================================================

const Dashboard = React.memo(({ states, onStateSelect, onExportToExcel }) => {
  return (
    <div className="dashboard">
      <div className="section-header">
        <h2>Select State</h2>
        <p>Choose a state to view projects</p>
      </div>
      
      <div className="export-section">
        <button className="export-btn" onClick={onExportToExcel}>
          📊 Export All Data (Excel)
        </button>
        <p className="export-note">
          Download complete project data for reporting.
        </p>
      </div>

      <div className="states-grid">
        {states.map((state) => (
          <div 
            key={state}
            className="state-card"
            onClick={() => onStateSelect(state)}
          >
            <div className="state-info">
                <div className="state-icon">
                    📍
                </div>
                <h3>{state}</h3>
            </div>
            <span className="arrow">→</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const ProjectList = React.memo(({ state, projects, onProjectSelect, onBack, onAddProject, onDeleteProject }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="project-list">
      <div className="section-header">
        <button className="back-btn" onClick={onBack}>← Back to States</button>
        <h2>Projects in {state} ({projects.length})</h2>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + Add Project
        </button>
      </div>

      <div className="projects-grid">
        {projects.map(project => (
          <div 
            key={project.id}
            className="project-card"
          >
            <div className="project-header">
              <h3 onClick={() => onProjectSelect(project)} style={{cursor: 'pointer'}}>
                {project.projectName}
              </h3>
              <div className="project-actions">
                <span className="project-value">
                  ₹{project.projectValue?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            
            <p className="project-desc">{project.description}</p>
            
            <div className="project-info">
                <div>
                    <strong>Engineer:</strong> {project.siteEngineer}
                </div>
                <div>
                    <strong>Progress:</strong> {project.percentageComplete || 0}%
                </div>
            </div>
            
            {/* Action buttons moved to the bottom right for better mobile tap target */}
            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '1rem'}}>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  style={{fontSize: '1rem', padding: '0.6rem'}}
                >
                  🗑️
                </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="empty-state">
          <p>No projects found in {state}. Create your first project!</p>
        </div>
      )}

      {showForm && (
        <ProjectForm
          state={state}
          onSave={(data) => {
            onAddProject(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
});

const ProjectForm = React.memo(({ state, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    siteEngineer: '',
    startDate: new Date().toISOString().split('T')[0],
    tentativeCompletion: '',
    projectValue: '',
    state: state
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.projectName && formData.siteEngineer && formData.projectValue) {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>New Project - {state}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Site Engineer *</label>
              <input
                type="text"
                value={formData.siteEngineer}
                onChange={(e) => setFormData({...formData, siteEngineer: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Project Value (₹) *</label>
              <input
                type="number"
                value={formData.projectValue}
                onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Completion Date *</label>
              <input
                type="date"
                value={formData.tentativeCompletion}
                onChange={(e) => setFormData({...formData, tentativeCompletion: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
});

const ProjectDetail = React.memo(({ project, onBack, onUpdateProject, onDeleteProject }) => {
  const [activeTab, setActiveTab] = useState('summary'); // Set summary as default tab

  return (
    <div className="project-detail">
      <div className="section-header">
        <button className="back-btn" onClick={onBack}>← Back to Projects</button>
        <div>
          <h2>{project.projectName}</h2>
          <p className="project-location">{project.state}</p>
        </div>
        <button 
          className="delete-btn"
          onClick={() => onDeleteProject(project.id)}
        >
          🗑️ Delete
        </button>
      </div>
      
      {/* Project Summary is always visible above tabs */}
      <ProjectSummary project={project} />

      <div className="tabs">
         <button 
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={activeTab === 'labours' ? 'active' : ''}
          onClick={() => setActiveTab('labours')}
        >
          Labours
        </button>
        <button 
          className={activeTab === 'materials' ? 'active' : ''}
          onClick={() => setActiveTab('materials')}
        >
          Materials
        </button>
        <button 
          className={activeTab === 'info' ? 'active' : ''}
          onClick={() => setActiveTab('info')}
        >
          Info & Progress
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'summary' && <ProjectSummary project={project} />}
        {activeTab === 'labours' && (
          <LabourManagement 
            labours={project.labours || []}
            onUpdate={(labours) => onUpdateProject({...project, labours})}
          />
        )}
        {activeTab === 'materials' && (
          <MaterialManagement 
            materials={project.materials || []}
            onUpdate={(materials) => onUpdateProject({...project, materials})}
          />
        )}
        {activeTab === 'info' && (
          <ProjectInfo 
            project={project}
            onUpdate={onUpdateProject}
          />
        )}
      </div>
    </div>
  );
});

const LabourManagement = React.memo(({ labours, onUpdate }) => {
  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2);
  const initialLabours = labours.map(labour => ({
    ...labour,
    id: labour.id || generateUniqueId(),
    dailySalary: labour.dailySalary !== undefined ? labour.dailySalary : 0, 
  }));
  
  const [showForm, setShowForm] = useState(false);
  const [editingLabour, setEditingLabour] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    numberOfLabours: '',
    dailySalary: '', 
    workDescription: ''
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      numberOfLabours: '',
      dailySalary: '',
      workDescription: ''
    });
    setEditingLabour(null);
  };

  const handleSaveLabour = () => {
    const labourData = {
      ...formData,
      id: editingLabour ? editingLabour.id : generateUniqueId(),
      numberOfLabours: parseInt(formData.numberOfLabours),
      dailySalary: parseFloat(formData.dailySalary)
    };

    let updatedLabours;
    if (editingLabour) {
      updatedLabours = initialLabours.map(labour => 
        labour.id === editingLabour.id ? labourData : labour
      );
    } else {
      updatedLabours = [...initialLabours, labourData];
    }

    onUpdate(updatedLabours);
    setShowForm(false);
    resetForm();
  };

  const editLabour = (labour) => {
    setEditingLabour(labour);
    setFormData({
      date: labour.date,
      numberOfLabours: labour.numberOfLabours.toString(),
      dailySalary: labour.dailySalary.toString(),
      workDescription: labour.workDescription
    });
    setShowForm(true);
  };

  const deleteLabour = (id) => {
    const updatedLabours = initialLabours.filter(labour => labour.id !== id);
    onUpdate(updatedLabours);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.numberOfLabours > 0 && formData.dailySalary >= 0) {
      handleSaveLabour();
    } else {
      alert('Please enter valid numbers for labours and salary.');
    }
  };

  return (
    <div className="labour-management">
      <div className="section-header">
        <h3>👷 Labour Entries</h3>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Entry
        </button>
      </div>

      {initialLabours.length === 0 ? (
        <div className="empty-state">
          <p>No labour entries yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>No.</th>
                <th>Daily Salary (₹)</th> 
                <th>Total (₹)</th> 
                <th>Work Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialLabours.map(labour => (
                <tr key={labour.id}>
                  <td>{new Date(labour.date).toLocaleDateString()}</td>
                  <td>{labour.numberOfLabours}</td>
                  <td>₹{labour.dailySalary?.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td> 
                  <td>
                    ₹{(labour.numberOfLabours * labour.dailySalary)?.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </td> 
                  <td>{labour.workDescription}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => editLabour(labour)}
                        title="Edit labour entry"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteLabour(labour.id)}
                        title="Delete labour entry"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingLabour ? 'Edit Labour Entry' : 'Add Labour Entry'}</h3>
              <button className="close-btn" onClick={() => { setShowForm(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Number of Labours *</label>
                <input
                  type="number"
                  value={formData.numberOfLabours}
                  onChange={(e) => setFormData({...formData, numberOfLabours: e.target.value})}
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Daily Salary (₹) *</label> 
                <input
                  type="number"
                  value={formData.dailySalary}
                  onChange={(e) => setFormData({...formData, dailySalary: e.target.value})}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Work Description *</label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) => setFormData({...formData, workDescription: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                <button type="submit">{editingLabour ? 'Update Labour' : 'Add Labour'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

const MaterialManagement = React.memo(({ materials, onUpdate }) => {
  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2);
  const initialMaterials = materials.map(material => ({
    ...material,
    id: material.id || generateUniqueId(),
    cost: material.cost !== undefined ? material.cost : 0, 
  }));
    
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    materialName: '',
    cost: '',
    dateOfPurchase: new Date().toISOString().split('T')[0],
    quantity: '',
    supplier: ''
  });

  const resetForm = () => {
    setFormData({
      materialName: '',
      cost: '',
      dateOfPurchase: new Date().toISOString().split('T')[0],
      quantity: '',
      supplier: ''
    });
    setEditingMaterial(null);
  };

  const handleSaveMaterial = () => {
    const materialData = {
      ...formData,
      id: editingMaterial ? editingMaterial.id : generateUniqueId(),
      cost: parseFloat(formData.cost),
      quantity: parseInt(formData.quantity)
    };

    let updatedMaterials;
    if (editingMaterial) {
      updatedMaterials = initialMaterials.map(material => 
        material.id === editingMaterial.id ? materialData : material
      );
    } else {
      updatedMaterials = [...initialMaterials, materialData];
    }

    onUpdate(updatedMaterials);
    setShowForm(false);
    resetForm();
  };

  const editMaterial = (material) => {
    setEditingMaterial(material);
    setFormData({
      materialName: material.materialName,
      cost: material.cost.toString(),
      dateOfPurchase: material.dateOfPurchase,
      quantity: material.quantity.toString(),
      supplier: material.supplier
    });
    setShowForm(true);
  };

  const deleteMaterial = (id) => {
    const updatedMaterials = initialMaterials.filter(material => material.id !== id);
    onUpdate(updatedMaterials);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.quantity > 0 && formData.cost >= 0) {
      handleSaveMaterial();
    } else {
      alert('Please enter valid numbers for quantity and cost.');
    }
  };

  return (
    <div className="material-management">
      <div className="section-header">
        <h3>🧱 Material Entries</h3>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Material
        </button>
      </div>

      {initialMaterials.length === 0 ? (
        <div className="empty-state">
          <p>No materials added yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Unit Cost (₹)</th>
                <th>Quantity</th>
                <th>Total Cost (₹)</th>
                <th>Purchase Date</th>
                <th>Supplier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialMaterials.map(material => (
                <tr key={material.id}>
                  <td>{material.materialName}</td>
                  <td>₹{material.cost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>{material.quantity}</td>
                  <td>
                    ₹{(material.cost * material.quantity)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td> 
                  <td>{new Date(material.dateOfPurchase).toLocaleDateString()}</td>
                  <td>{material.supplier}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-btn"
                        onClick={() => editMaterial(material)}
                        title="Edit material entry"
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteMaterial(material.id)}
                        title="Delete material entry"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
              <button className="close-btn" onClick={() => { setShowForm(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Material Name *</label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Cost (₹) *</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Date *</label>
                  <input
                    type="date"
                    value={formData.dateOfPurchase}
                    onChange={(e) => setFormData({...formData, dateOfPurchase: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Supplier *</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                <button type="submit">{editingMaterial ? 'Update Material' : 'Add Material'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

const ProjectInfo = React.memo(({ project, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(project);

  const saveChanges = () => {
    const progress = Math.min(100, Math.max(0, parseInt(formData.percentageComplete) || 0));
    
    onUpdate({
      ...formData,
      projectValue: parseFloat(formData.projectValue),
      percentageComplete: progress // Save clamped progress value
    });
    setIsEditing(false);
  };

  return (
    <div className="project-info">
      <div className="section-header">
        <h3>Project Information</h3>
        <button 
          className={isEditing ? 'save-btn' : 'edit-btn'}
          onClick={isEditing ? saveChanges : () => setIsEditing(true)}
        >
          {isEditing ? '💾 Save' : '✏️ Edit'}
        </button>
      </div>

      <div className="info-grid">
        <div className="info-item">
          <label>Project Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
            />
          ) : (
            <span>{project.projectName}</span>
          )}
        </div>

        <div className="info-item">
          <label>Project Value</label>
          {isEditing ? (
            <input
              type="number"
              value={formData.projectValue}
              onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
              min="0"
              step="0.01"
            />
          ) : (
            <span>₹{project.projectValue?.toLocaleString('en-IN')}</span>
          )}
        </div>
        
        <div className="info-item">
          <label>Progress (%)</label>
          {isEditing ? (
            <input
              type="number"
              value={formData.percentageComplete}
              onChange={(e) => setFormData({...formData, percentageComplete: e.target.value})}
              min="0"
              max="100"
            />
          ) : (
            <span>{project.percentageComplete || 0}%</span>
          )}
        </div>

        <div className="info-item">
          <label>Site Engineer</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.siteEngineer}
              onChange={(e) => setFormData({...formData, siteEngineer: e.target.value})}
            />
          ) : (
            <span>{project.siteEngineer}</span>
          )}
        </div>

        <div className="info-item">
          <label>Start Date</label>
          {isEditing ? (
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            />
          ) : (
            <span>{new Date(project.startDate).toLocaleDateString()}</span>
          )}
        </div>
        
        <div className="info-item">
          <label>Completion Date</label>
          {isEditing ? (
            <input
              type="date"
              value={formData.tentativeCompletion}
              onChange={(e) => setFormData({...formData, tentativeCompletion: e.target.value})}
            />
          ) : (
            <span>{project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'N/A'}</span>
          )}
        </div>

        <div className="info-item full-width">
          <label>Description</label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          ) : (
            <span>{project.description}</span>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="edit-actions">
          <button onClick={() => {setIsEditing(false); setFormData(project);}}>Cancel</button>
        </div>
      )}
    </div>
  );
});

export default App;
