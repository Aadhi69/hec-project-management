/* App.js - Enhanced Android Mobile Optimized */
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { database } from './firebase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { usePWA } from './hooks/usePWA';
import { debounce } from 'lodash';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const { isInstallable, installApp } = usePWA();

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalProjects: 0,
    totalValue: 0,
    totalLabourCost: 0,
    totalMaterialCost: 0,
    activeProjects: 0,
    completedProjects: 0
  });

  // Corrected states data
  const states = [
    'Tamil Nadu', 'Delhi', 'Uttar Pradesh'
  ];

  // Utility to generate a unique ID
  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2);

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    const id = generateUniqueId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  // Load data from Firebase
  const loadProjectsFromFirebase = useCallback(async () => {
    try {
      setLoading(true);
      const projectsData = await database.getProjects();
      setProjects(projectsData);
      showToast('Data loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Using offline data', 'warning');
      // Fallback to localStorage if Firebase fails
      const savedProjects = localStorage.getItem('hec-projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Calculate analytics
  useEffect(() => {
    if (projects.length > 0) {
      const analyticsData = projects.reduce((acc, project) => {
        acc.totalProjects++;
        acc.totalValue += project.projectValue || 0;
        
        const labourCost = (project.labours || []).reduce((sum, labour) => 
          sum + (labour.numberOfLabours * (labour.dailySalary || 0)), 0);
        
        const materialCost = (project.materials || []).reduce((sum, material) => 
          sum + (material.cost || 0) * material.quantity, 0);
        
        acc.totalLabourCost += labourCost;
        acc.totalMaterialCost += materialCost;
        
        // Check project status
        if (project.tentativeCompletion && new Date(project.tentativeCompletion) < new Date()) {
          acc.completedProjects++;
        } else {
          acc.activeProjects++;
        }
        
        return acc;
      }, {
        totalProjects: 0,
        totalValue: 0,
        totalLabourCost: 0,
        totalMaterialCost: 0,
        activeProjects: 0,
        completedProjects: 0
      });
      
      setAnalytics(analyticsData);
    }
  }, [projects]);

  // Check for deadlines (runs once a day)
  useEffect(() => {
    const checkDeadlines = () => {
      projects.forEach(project => {
        if (project.tentativeCompletion) {
          const daysLeft = Math.ceil((new Date(project.tentativeCompletion) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft > 0) {
            showToast(`Project "${project.projectName}" deadline in ${daysLeft} days`, 'warning');
          }
        }
      });
    };
    
    // Check immediately
    checkDeadlines();
    
    // Check daily
    const interval = setInterval(checkDeadlines, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [projects, showToast]);

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
      status: 'active'
    };
    
    try {
      await database.saveProject(project);
      setProjects(prev => [...prev, project]);
      
      // Also save to localStorage as backup
      const updatedProjects = [...projects, project];
      localStorage.setItem('hec-projects', JSON.stringify(updatedProjects));
      
      showToast('Project created successfully', 'success');
    } catch (error) {
      console.error('Error saving project:', error);
      // Fallback to localStorage
      setProjects(prev => [...prev, project]);
      localStorage.setItem('hec-projects', JSON.stringify([...projects, project]));
      showToast('Project saved locally', 'warning');
    }
  }, [projects, showToast]);

  const updateProject = useCallback(async (updatedProject) => {
    try {
      await database.saveProject(updatedProject);
      setProjects(prev => prev.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ));
      
      // Update selected project if it's the one being updated
      if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
      }
      
      // Update localStorage as backup
      localStorage.setItem('hec-projects', JSON.stringify(
        projects.map(p => p.id === updatedProject.id ? updatedProject : p)
      ));
      
      showToast('Project updated successfully', 'success');
    } catch (error) {
      console.error('Error updating project:', error);
      showToast('Updated locally', 'warning');
      // Fallback to localStorage
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
  }, [projects, selectedProject, showToast]);

  const deleteProject = useCallback(async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await database.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        // Update localStorage
        localStorage.setItem('hec-projects', JSON.stringify(
          projects.filter(p => p.id !== projectId)
        ));
        
        if (selectedProject && selectedProject.id === projectId) {
          setCurrentView('projects');
          setSelectedProject(null);
        }
        
        showToast('Project deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Deleted locally', 'warning');
        // Fallback to localStorage
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
  }, [projects, selectedProject, showToast]);

  // Advanced Export function
  const advancedExport = async (filters) => {
    try {
      let filteredProjects = projects;
      
      // Apply state filter
      if (filters.state !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.state === filters.state);
      }
      
      // Apply date filter
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case 'lastMonth':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'currentQuarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'currentMonth':
        default:
          startDate.setMonth(startDate.getMonth());
          startDate.setDate(1);
      }
      
      filteredProjects = filteredProjects.filter(p => 
        new Date(p.createdAt) >= startDate
      );

      if (filteredProjects.length === 0) {
        showToast('No data available to export.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();
      
      // Prepare projects data
      const projectsData = filteredProjects.map(project => ({
        'Project ID': project.id,
        'Project Name': project.projectName,
        'Description': project.description,
        'State': project.state,
        'Status': project.status || 'active',
        'Site Engineer': project.siteEngineer,
        'Start Date': new Date(project.startDate).toLocaleDateString(),
        'Completion Date': project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'N/A',
        'Project Value (₹)': project.projectValue,
        'Total Labour Entries': project.labours?.length || 0,
        'Total Material Entries': project.materials?.length || 0,
        'Created Date': new Date(project.createdAt).toLocaleDateString()
      }));

      // Prepare labours data
      const laboursData = filteredProjects.flatMap(project => 
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

      // Prepare materials data
      const materialsData = filteredProjects.flatMap(project => 
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

      // Create worksheets
      const projectsWs = XLSX.utils.json_to_sheet(projectsData);
      if (filters.includeLabours && laboursData.length > 0) {
        const laboursWs = XLSX.utils.json_to_sheet(laboursData);
        XLSX.utils.book_append_sheet(wb, laboursWs, 'Labours');
      }
      if (filters.includeMaterials && materialsData.length > 0) {
        const materialsWs = XLSX.utils.json_to_sheet(materialsData);
        XLSX.utils.book_append_sheet(wb, materialsWs, 'Materials');
      }
      
      const summaryWs = XLSX.utils.json_to_sheet([{
        'Report Generated': new Date().toLocaleString(),
        'Total Projects': filteredProjects.length,
        'Total Project Value': `₹${filteredProjects.reduce((sum, p) => sum + p.projectValue, 0).toLocaleString('en-IN')}`,
        'Total Labour Entries': laboursData.length,
        'Total Material Entries': materialsData.length
      }]);
      
      XLSX.utils.book_append_sheet(wb, projectsWs, 'Projects');
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const nowDate = new Date();
      const monthYear = nowDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      const fileName = `HEC_Export_${filters.dateRange}_${monthYear.replace(' ', '_')}.xlsx`;
      
      saveAs(data, fileName);
      
      showToast(`Export completed: ${filteredProjects.length} projects`, 'success');
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Error exporting data', 'error');
    }
  };

  // Quick export (original function)
  const quickExport = async () => {
    try {
      if (projects.length === 0) {
        showToast('No data available to export.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();
      
      const projectsData = projects.map(project => ({
        'Project ID': project.id,
        'Project Name': project.projectName,
        'Description': project.description,
        'State': project.state,
        'Site Engineer': project.siteEngineer,
        'Start Date': new Date(project.startDate).toLocaleDateString(),
        'Completion Date': project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'N/A',
        'Project Value (₹)': project.projectValue,
        'Total Labour Entries': project.labours?.length || 0,
        'Total Material Entries': project.materials?.length || 0,
        'Created Date': new Date(project.createdAt).toLocaleDateString()
      }));

      const projectsWs = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(wb, projectsWs, 'Projects');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const fileName = `HEC_Quick_Export_${monthYear.replace(' ', '_')}.xlsx`;
      
      saveAs(data, fileName);
      
      showToast('Quick export completed', 'success');
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Export failed', 'error');
    }
  };

  // Filter projects based on search
  const filteredProjects = searchQuery 
    ? projects.filter(p => 
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.siteEngineer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

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
          <p>Project Management System</p>
        </div>
      </header>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' ? '✅' : 
               toast.type === 'error' ? '❌' : 
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>

      {/* PWA Install Prompt */}
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
            projects={projects}
            onStateSelect={handleStateSelect}
            onExport={() => setShowExportModal(true)}
            onQuickExport={quickExport}
            analytics={analytics}
          />
        )}

        {currentView === 'projects' && (
          <ProjectList
            state={selectedState}
            projects={filteredProjects.filter(p => p.state === selectedState)}
            onProjectSelect={handleProjectSelect}
            onBack={() => setCurrentView('dashboard')}
            onAddProject={addProject}
            onDeleteProject={deleteProject}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />
        )}

        {currentView === 'project-detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            onBack={() => setCurrentView('projects')}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
            analytics={analytics}
          />
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={advancedExport}
        states={states}
      />
    </div>
  );
}

// Enhanced Dashboard Component
const Dashboard = React.memo(({ states, projects, onStateSelect, onExport, onQuickExport, analytics }) => {
  // Calculate state-wise statistics
  const stateStats = states.map(state => {
    const stateProjects = projects.filter(p => p.state === state);
    const completed = stateProjects.filter(p => 
      p.tentativeCompletion && new Date(p.tentativeCompletion) < new Date()
    ).length;
    
    return {
      name: state,
      totalProjects: stateProjects.length,
      completedProjects: completed,
      totalValue: stateProjects.reduce((sum, p) => sum + (p.projectValue || 0), 0),
      completionRate: stateProjects.length > 0 ? (completed / stateProjects.length) * 100 : 0
    };
  });

  return (
    <div className="dashboard">
      <div className="section-header">
        <h2>Dashboard Overview</h2>
        <p>Project management at a glance</p>
      </div>
      
      {/* Analytics Cards */}
      <div className="analytics-grid">
        <div className="analytics-card total-projects">
          <div className="analytics-icon">📋</div>
          <div className="analytics-content">
            <h3>{analytics.totalProjects}</h3>
            <p>Total Projects</p>
            <small>{analytics.activeProjects} active • {analytics.completedProjects} completed</small>
          </div>
        </div>
        
        <div className="analytics-card total-value">
          <div className="analytics-icon">💰</div>
          <div className="analytics-content">
            <h3>₹{analytics.totalValue.toLocaleString('en-IN')}</h3>
            <p>Total Value</p>
          </div>
        </div>
        
        <div className="analytics-card labour-cost">
          <div className="analytics-icon">👷</div>
          <div className="analytics-content">
            <h3>₹{analytics.totalLabourCost.toLocaleString('en-IN')}</h3>
            <p>Labour Cost</p>
          </div>
        </div>
        
        <div className="analytics-card material-cost">
          <div className="analytics-icon">🏗️</div>
          <div className="analytics-content">
            <h3>₹{analytics.totalMaterialCost.toLocaleString('en-IN')}</h3>
            <p>Material Cost</p>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="export-section">
        <button className="export-btn" onClick={onExport}>
          📊 Advanced Export
        </button>
        <div className="quick-export-buttons">
          <button className="quick-export" onClick={onQuickExport}>
            Monthly Report
          </button>
          <button className="quick-export" onClick={() => onExport({dateRange: 'currentQuarter', state: 'all'})}>
            Quarterly Report
          </button>
        </div>
      </div>

      {/* States Grid with Progress */}
      <div className="section-header">
        <h2>Projects by State</h2>
        <p>Click on a state to view projects</p>
      </div>
      
      <div className="states-grid">
        {stateStats.map((state) => (
          <div 
            key={state.name}
            className="state-card"
            onClick={() => onStateSelect(state.name)}
          >
            <div className="state-icon">
              {state.name.charAt(0)}
            </div>
            <h3>{state.name}</h3>
            <div className="state-stats">
              <span className="project-count">{state.totalProjects} Projects</span>
              <span className="project-value">₹{state.totalValue.toLocaleString('en-IN')}</span>
              {state.totalProjects > 0 && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${state.completionRate}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{Math.round(state.completionRate)}% Complete</span>
                </div>
              )}
            </div>
            <span className="arrow">→</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Enhanced Project List Component
const ProjectList = React.memo(({ state, projects, onProjectSelect, onBack, onAddProject, onDeleteProject, searchQuery, onSearch }) => {
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  // Sort projects
  const sortedProjects = [...projects].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return (b.projectValue || 0) - (a.projectValue || 0);
      case 'date':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'name':
      default:
        return a.projectName.localeCompare(b.projectName);
    }
  });

  return (
    <div className="project-list">
      <div className="section-header">
        <button className="back-btn" onClick={onBack}>← Back to States</button>
        <div>
          <h2>Projects in {state}</h2>
          <p>{projects.length} project{projects.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(true)}>
          + Add Project
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="filter-bar">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="sort-options">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="value">Value</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      <div className="projects-grid">
        {sortedProjects.map(project => {
          // Calculate project status
          const isCompleted = project.tentativeCompletion && 
            new Date(project.tentativeCompletion) < new Date();
          const isDelayed = project.tentativeCompletion && 
            new Date(project.tentativeCompletion) < new Date() && 
            !isCompleted;
          
          return (
            <div 
              key={project.id}
              className="project-card"
            >
              <div className="project-header">
                <div className="project-title" onClick={() => onProjectSelect(project)}>
                  <h3>{project.projectName}</h3>
                  <div className="project-status">
                    <span className={`status-badge ${isCompleted ? 'status-completed' : isDelayed ? 'status-delayed' : 'status-active'}`}>
                      {isCompleted ? 'Completed' : isDelayed ? 'Delayed' : 'Active'}
                    </span>
                  </div>
                </div>
                <div className="project-actions">
                  <span className="project-value">
                    ₹{project.projectValue?.toLocaleString('en-IN')}
                  </span>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    title="Delete Project"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="project-desc">{project.description}</p>
              <div className="project-info">
                <div>
                  <strong>Engineer:</strong> {project.siteEngineer}
                </div>
                <div>
                  <strong>Start:</strong> {new Date(project.startDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Completion:</strong> {project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div className="project-meta">
                <span className="labour-count">👷 {project.labours?.length || 0} labour entries</span>
                <span className="material-count">🏗️ {project.materials?.length || 0} material entries</span>
              </div>
            </div>
          );
        })}
      </div>

      {sortedProjects.length === 0 && (
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

// Project Form Component (Enhanced with validation)
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

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    } else if (formData.projectName.length < 3) {
      newErrors.projectName = 'Project name must be at least 3 characters';
    }
    
    if (!formData.siteEngineer.trim()) {
      newErrors.siteEngineer = 'Site engineer is required';
    }
    
    if (!formData.projectValue || parseFloat(formData.projectValue) <= 0) {
      newErrors.projectValue = 'Project value must be positive';
    }
    
    if (!formData.tentativeCompletion) {
      newErrors.tentativeCompletion = 'Completion date is required';
    } else if (new Date(formData.tentativeCompletion) < new Date(formData.startDate)) {
      newErrors.tentativeCompletion = 'Completion date must be after start date';
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length === 0) {
      onSave(formData);
    } else {
      setErrors(validationErrors);
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
              className={errors.projectName ? 'error' : ''}
            />
            {errors.projectName && <span className="error-message">{errors.projectName}</span>}
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
              placeholder="Brief description of the project..."
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Site Engineer *</label>
              <input
                type="text"
                value={formData.siteEngineer}
                onChange={(e) => setFormData({...formData, siteEngineer: e.target.value})}
                className={errors.siteEngineer ? 'error' : ''}
              />
              {errors.siteEngineer && <span className="error-message">{errors.siteEngineer}</span>}
            </div>
            <div className="form-group">
              <label>Project Value (₹) *</label>
              <input
                type="number"
                value={formData.projectValue}
                onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
                min="0"
                step="0.01"
                className={errors.projectValue ? 'error' : ''}
              />
              {errors.projectValue && <span className="error-message">{errors.projectValue}</span>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Completion Date *</label>
              <input
                type="date"
                value={formData.tentativeCompletion}
                onChange={(e) => setFormData({...formData, tentativeCompletion: e.target.value})}
                className={errors.tentativeCompletion ? 'error' : ''}
              />
              {errors.tentativeCompletion && <span className="error-message">{errors.tentativeCompletion}</span>}
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

// Export Modal Component
const ExportModal = React.memo(({ show, onClose, onExport, states }) => {
  const [filters, setFilters] = useState({
    dateRange: 'currentMonth',
    state: 'all',
    includeLabours: true,
    includeMaterials: true,
    format: 'excel'
  });

  const handleExport = () => {
    onExport(filters);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal export-modal">
        <div className="modal-header">
          <h3>Advanced Export Options</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="export-filters">
          <div className="form-group">
            <label>Date Range</label>
            <select 
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            >
              <option value="currentMonth">Current Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="currentQuarter">Current Quarter</option>
              <option value="allTime">All Time</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>State</label>
            <select 
              value={filters.state}
              onChange={(e) => setFilters({...filters, state: e.target.value})}
            >
              <option value="all">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.includeLabours}
                onChange={(e) => setFilters({...filters, includeLabours: e.target.checked})}
              />
              <span>Include Labour Data</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.includeMaterials}
                onChange={(e) => setFilters({...filters, includeMaterials: e.target.checked})}
              />
              <span>Include Material Data</span>
            </label>
          </div>
          
          <div className="form-group">
            <label>Export Format</label>
            <div className="format-buttons">
              <button 
                className={filters.format === 'excel' ? 'active' : ''}
                onClick={() => setFilters({...filters, format: 'excel'})}
                type="button"
              >
                Excel
              </button>
              <button 
                className={filters.format === 'csv' ? 'active' : ''}
                onClick={() => setFilters({...filters, format: 'csv'})}
                type="button"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="secondary-btn">Cancel</button>
          <button type="button" onClick={handleExport} className="primary-btn">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
});

// Project Detail Component (Enhanced with statistics)
const ProjectDetail = React.memo(({ project, onBack, onUpdateProject, onDeleteProject, analytics }) => {
  const [activeTab, setActiveTab] = useState('labours');

  // Calculate project statistics
  const projectStats = {
    totalLabourCost: (project.labours || []).reduce((sum, labour) => 
      sum + (labour.numberOfLabours * (labour.dailySalary || 0)), 0),
    totalMaterialCost: (project.materials || []).reduce((sum, material) => 
      sum + (material.cost || 0) * material.quantity, 0),
    totalLabourEntries: (project.labours || []).length,
    totalMaterialEntries: (project.materials || []).length
  };

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
          Delete Project
        </button>
      </div>

      {/* Project Stats Bar */}
      <div className="project-stats-bar">
        <div className="stat-item">
          <span className="stat-label">Project Value</span>
          <span className="stat-value">₹{project.projectValue?.toLocaleString('en-IN')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Labour Cost</span>
          <span className="stat-value">₹{projectStats.totalLabourCost.toLocaleString('en-IN')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Material Cost</span>
          <span className="stat-value">₹{projectStats.totalMaterialCost.toLocaleString('en-IN')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Cost</span>
          <span className="stat-value">₹{(projectStats.totalLabourCost + projectStats.totalMaterialCost).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={activeTab === 'labours' ? 'active' : ''}
            onClick={() => setActiveTab('labours')}
          >
            Labours ({projectStats.totalLabourEntries})
          </button>
          <button 
            className={activeTab === 'materials' ? 'active' : ''}
            onClick={() => setActiveTab('materials')}
          >
            Materials ({projectStats.totalMaterialEntries})
          </button>
          <button 
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => setActiveTab('info')}
          >
            Project Info
          </button>
          <button 
            className={activeTab === 'summary' ? 'active' : ''}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
        </div>
      </div>

      <div className="tab-content">
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
        {activeTab === 'summary' && (
          <ProjectSummary 
            project={project}
            stats={projectStats}
          />
        )}
      </div>
    </div>
  );
});

// Enhanced Labour Management Component
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

  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      numberOfLabours: '',
      dailySalary: '',
      workDescription: ''
    });
    setEditingLabour(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.numberOfLabours || parseInt(formData.numberOfLabours) <= 0) {
      newErrors.numberOfLabours = 'Number of labours must be positive';
    }
    
    if (!formData.dailySalary || parseFloat(formData.dailySalary) < 0) {
      newErrors.dailySalary = 'Daily salary must be positive';
    }
    
    if (!formData.workDescription.trim()) {
      newErrors.workDescription = 'Work description is required';
    }
    
    return newErrors;
  };

  const handleSaveLabour = () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

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

    // Sort by date (newest first)
    updatedLabours.sort((a, b) => new Date(b.date) - new Date(a.date));

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
    if (window.confirm('Are you sure you want to delete this labour entry?')) {
      const updatedLabours = initialLabours.filter(labour => labour.id !== id);
      onUpdate(updatedLabours);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveLabour();
  };

  // Calculate totals
  const totals = initialLabours.reduce((acc, labour) => {
    acc.totalLabours += labour.numberOfLabours;
    acc.totalCost += labour.numberOfLabours * labour.dailySalary;
    return acc;
  }, { totalLabours: 0, totalCost: 0 });

  return (
    <div className="labour-management">
      <div className="section-header">
        <h3>Labour Management</h3>
        <div className="total-stats">
          <span>Total: {totals.totalLabours} labours • ₹{totals.totalCost.toLocaleString('en-IN')}</span>
        </div>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Labour Entry
        </button>
      </div>

      {initialLabours.length === 0 ? (
        <div className="empty-state">
          <p>No labour entries yet. Add your first labour entry.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>No. of Labours</th>
                <th>Daily Salary (₹)</th>
                <th>Total Daily Salary (₹)</th>
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
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2"><strong>Total</strong></td>
                <td></td>
                <td><strong>₹{totals.totalCost.toLocaleString('en-IN')}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
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
                  className={errors.date ? 'error' : ''}
                />
                {errors.date && <span className="error-message">{errors.date}</span>}
              </div>
              <div className="form-group">
                <label>Number of Labours *</label>
                <input
                  type="number"
                  value={formData.numberOfLabours}
                  onChange={(e) => setFormData({...formData, numberOfLabours: e.target.value})}
                  min="1"
                  className={errors.numberOfLabours ? 'error' : ''}
                />
                {errors.numberOfLabours && <span className="error-message">{errors.numberOfLabours}</span>}
              </div>
              <div className="form-group">
                <label>Daily Salary (₹) *</label>
                <input
                  type="number"
                  value={formData.dailySalary}
                  onChange={(e) => setFormData({...formData, dailySalary: e.target.value})}
                  min="0"
                  step="0.01"
                  className={errors.dailySalary ? 'error' : ''}
                />
                {errors.dailySalary && <span className="error-message">{errors.dailySalary}</span>}
              </div>
              <div className="form-group">
                <label>Work Description *</label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) => setFormData({...formData, workDescription: e.target.value})}
                  rows="3"
                  className={errors.workDescription ? 'error' : ''}
                  placeholder="Describe the work done..."
                />
                {errors.workDescription && <span className="error-message">{errors.workDescription}</span>}
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

// Enhanced Material Management Component
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

  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setFormData({
      materialName: '',
      cost: '',
      dateOfPurchase: new Date().toISOString().split('T')[0],
      quantity: '',
      supplier: ''
    });
    setEditingMaterial(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.materialName.trim()) {
      newErrors.materialName = 'Material name is required';
    }
    
    if (!formData.cost || parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost must be positive';
    }
    
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be positive';
    }
    
    if (!formData.dateOfPurchase) {
      newErrors.dateOfPurchase = 'Purchase date is required';
    }
    
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Supplier is required';
    }
    
    return newErrors;
  };

  const handleSaveMaterial = () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

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

    // Sort by purchase date (newest first)
    updatedMaterials.sort((a, b) => new Date(b.dateOfPurchase) - new Date(a.dateOfPurchase));

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
    if (window.confirm('Are you sure you want to delete this material entry?')) {
      const updatedMaterials = initialMaterials.filter(material => material.id !== id);
      onUpdate(updatedMaterials);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveMaterial();
  };

  // Calculate totals
  const totals = initialMaterials.reduce((acc, material) => {
    acc.totalQuantity += material.quantity;
    acc.totalCost += material.cost * material.quantity;
    return acc;
  }, { totalQuantity: 0, totalCost: 0 });

  return (
    <div className="material-management">
      <div className="section-header">
        <h3>Material Management</h3>
        <div className="total-stats">
          <span>Total: {totals.totalQuantity} units • ₹{totals.totalCost.toLocaleString('en-IN')}</span>
        </div>
        <button className="add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Material
        </button>
      </div>

      {initialMaterials.length === 0 ? (
        <div className="empty-state">
          <p>No materials added yet. Add your first material.</p>
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
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td></td>
                <td><strong>{totals.totalQuantity}</strong></td>
                <td><strong>₹{totals.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
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
                  className={errors.materialName ? 'error' : ''}
                  placeholder="e.g., Cement, Steel, Bricks"
                />
                {errors.materialName && <span className="error-message">{errors.materialName}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Cost (₹) *</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    min="0"
                    step="0.01"
                    className={errors.cost ? 'error' : ''}
                  />
                  {errors.cost && <span className="error-message">{errors.cost}</span>}
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    min="1"
                    className={errors.quantity ? 'error' : ''}
                  />
                  {errors.quantity && <span className="error-message">{errors.quantity}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Date *</label>
                  <input
                    type="date"
                    value={formData.dateOfPurchase}
                    onChange={(e) => setFormData({...formData, dateOfPurchase: e.target.value})}
                    className={errors.dateOfPurchase ? 'error' : ''}
                  />
                  {errors.dateOfPurchase && <span className="error-message">{errors.dateOfPurchase}</span>}
                </div>
                <div className="form-group">
                  <label>Supplier *</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className={errors.supplier ? 'error' : ''}
                  />
                  {errors.supplier && <span className="error-message">{errors.supplier}</span>}
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

// Project Info Component
const ProjectInfo = React.memo(({ project, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(project);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    
    if (!formData.projectValue || parseFloat(formData.projectValue) <= 0) {
      newErrors.projectValue = 'Project value must be positive';
    }
    
    if (!formData.siteEngineer.trim()) {
      newErrors.siteEngineer = 'Site engineer is required';
    }
    
    if (!formData.tentativeCompletion) {
      newErrors.tentativeCompletion = 'Completion date is required';
    } else if (new Date(formData.tentativeCompletion) < new Date(formData.startDate)) {
      newErrors.tentativeCompletion = 'Completion date must be after start date';
    }
    
    return newErrors;
  };

  const saveChanges = () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    onUpdate({
      ...formData,
      projectValue: parseFloat(formData.projectValue)
    });
    setIsEditing(false);
    setErrors({});
  };

  const cancelEdit = () => {
    setFormData(project);
    setIsEditing(false);
    setErrors({});
  };

  return (
    <div className="project-info">
      <div className="section-header">
        <h3>Project Information</h3>
        <button 
          className={isEditing ? 'save-btn' : 'edit-btn'}
          onClick={isEditing ? saveChanges : () => setIsEditing(true)}
        >
          {isEditing ? 'Save Changes' : 'Edit Information'}
        </button>
      </div>

      <div className="info-grid">
        <div className="info-item">
          <label>Project Name</label>
          {isEditing ? (
            <div>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                className={errors.projectName ? 'error' : ''}
              />
              {errors.projectName && <span className="error-message">{errors.projectName}</span>}
            </div>
          ) : (
            <span>{project.projectName}</span>
          )}
        </div>

        <div className="info-item">
          <label>Project Value</label>
          {isEditing ? (
            <div>
              <input
                type="number"
                value={formData.projectValue}
                onChange={(e) => setFormData({...formData, projectValue: e.target.value})}
                min="0"
                step="0.01"
                className={errors.projectValue ? 'error' : ''}
              />
              {errors.projectValue && <span className="error-message">{errors.projectValue}</span>}
            </div>
          ) : (
            <span>₹{project.projectValue?.toLocaleString('en-IN')}</span>
          )}
        </div>

        <div className="info-item">
          <label>Site Engineer</label>
          {isEditing ? (
            <div>
              <input
                type="text"
                value={formData.siteEngineer}
                onChange={(e) => setFormData({...formData, siteEngineer: e.target.value})}
                className={errors.siteEngineer ? 'error' : ''}
              />
              {errors.siteEngineer && <span className="error-message">{errors.siteEngineer}</span>}
            </div>
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
            <div>
              <input
                type="date"
                value={formData.tentativeCompletion}
                onChange={(e) => setFormData({...formData, tentativeCompletion: e.target.value})}
                className={errors.tentativeCompletion ? 'error' : ''}
              />
              {errors.tentativeCompletion && <span className="error-message">{errors.tentativeCompletion}</span>}
            </div>
          ) : (
            <span>{project.tentativeCompletion ? new Date(project.tentativeCompletion).toLocaleDateString() : 'Not set'}</span>
          )}
        </div>

        <div className="info-item">
          <label>Status</label>
          {isEditing ? (
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          ) : (
            <span className={`status-badge status-${project.status || 'active'}`}>
              {project.status || 'Active'}
            </span>
          )}
        </div>

        <div className="info-item full-width">
          <label>Description</label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="4"
            />
          ) : (
            <span>{project.description || 'No description provided'}</span>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="edit-actions">
          <button onClick={cancelEdit}>Cancel</button>
        </div>
      )}
    </div>
  );
});

// Project Summary Component
const ProjectSummary = React.memo(({ project, stats }) => {
  const completionDate = project.tentativeCompletion ? new Date(project.tentativeCompletion) : null;
  const today = new Date();
  const daysLeft = completionDate ? Math.ceil((completionDate - today) / (1000 * 60 * 60 * 24)) : null;
  
  const totalSpent = stats.totalLabourCost + stats.totalMaterialCost;
  const remainingBudget = project.projectValue - totalSpent;
  const budgetUtilization = (totalSpent / project.projectValue) * 100;

  return (
    <div className="project-summary">
      <div className="section-header">
        <h3>Project Summary</h3>
      </div>
      
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Budget Overview</h4>
            <div className="summary-stats">
              <div className="stat-row">
                <span>Total Budget:</span>
                <span className="stat-value">₹{project.projectValue?.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-row">
                <span>Total Spent:</span>
                <span className="stat-value">₹{totalSpent.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-row">
                <span>Remaining:</span>
                <span className={`stat-value ${remainingBudget < 0 ? 'negative' : 'positive'}`}>
                  ₹{remainingBudget.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  ></div>
                </div>
                <span className="progress-text">{budgetUtilization.toFixed(1)}% utilized</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Cost Breakdown</h4>
            <div className="summary-stats">
              <div className="stat-row">
                <span>Labour Cost:</span>
                <span className="stat-value">₹{stats.totalLabourCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-row">
                <span>Material Cost:</span>
                <span className="stat-value">₹{stats.totalMaterialCost.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-row">
                <span>Labour %:</span>
                <span className="stat-value">
                  {project.projectValue > 0 ? ((stats.totalLabourCost / project.projectValue) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="stat-row">
                <span>Material %:</span>
                <span className="stat-value">
                  {project.projectValue > 0 ? ((stats.totalMaterialCost / project.projectValue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <h4>Timeline</h4>
            <div className="summary-stats">
              <div className="stat-row">
                <span>Start Date:</span>
                <span className="stat-value">{new Date(project.startDate).toLocaleDateString()}</span>
              </div>
              <div className="stat-row">
                <span>Completion Date:</span>
                <span className="stat-value">
                  {completionDate ? completionDate.toLocaleDateString() : 'Not set'}
                </span>
              </div>
              {daysLeft !== null && (
                <>
                  <div className="stat-row">
                    <span>Days Left:</span>
                    <span className={`stat-value ${daysLeft < 0 ? 'negative' : daysLeft <= 7 ? 'warning' : 'positive'}`}>
                      {daysLeft} days
                    </span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: daysLeft < 0 ? '100%' : 
                                 completionDate ? `${(1 - daysLeft / Math.ceil((completionDate - new Date(project.startDate)) / (1000 * 60 * 60 * 24))) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {daysLeft < 0 ? 'Overdue' : completionDate ? 'Timeline progress' : 'No deadline'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <h4>Activity Summary</h4>
            <div className="summary-stats">
              <div className="stat-row">
                <span>Total Labour Entries:</span>
                <span className="stat-value">{stats.totalLabourEntries}</span>
              </div>
              <div className="stat-row">
                <span>Total Material Entries:</span>
                <span className="stat-value">{stats.totalMaterialEntries}</span>
              </div>
              <div className="stat-row">
                <span>Project Created:</span>
                <span className="stat-value">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="stat-row">
                <span>Last Updated:</span>
                <span className="stat-value">
                  {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="summary-notes">
        <h4>Notes & Recommendations</h4>
        <ul>
          {remainingBudget < 0 && (
            <li className="warning">⚠️ Project is over budget by ₹{Math.abs(remainingBudget).toLocaleString('en-IN')}</li>
          )}
          {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
            <li className="warning">⚠️ Project deadline is approaching in {daysLeft} days</li>
          )}
          {daysLeft !== null && daysLeft < 0 && (
            <li className="error">❌ Project is overdue by {Math.abs(daysLeft)} days</li>
          )}
          {budgetUtilization > 90 && (
            <li className="warning">⚠️ Budget utilization is at {budgetUtilization.toFixed(1)}% - monitor spending</li>
          )}
          {stats.totalLabourEntries === 0 && (
            <li className="info">ℹ️ No labour entries recorded yet</li>
          )}
          {stats.totalMaterialEntries === 0 && (
            <li className="info">ℹ️ No material entries recorded yet</li>
          )}
          {remainingBudget > 0 && budgetUtilization < 50 && (
            <li className="success">✅ Good budget control with {remainingBudget.toLocaleString('en-IN')} remaining</li>
          )}
        </ul>
      </div>
    </div>
  );
});

export default App;
