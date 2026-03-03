import React, { useState, useEffect, useRef } from 'react';
import { FiFileText, FiPlus, FiDownload, FiSend, FiLink, FiCheckCircle, FiX, FiEye, FiEdit, FiTrash2, FiUpload, FiSave, FiImage } from 'react-icons/fi';
import { offerLetterAPI, employeeAPI, recruitmentAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Draggable from 'react-draggable';

export default function OfferLetters() {
  const [activeTab, setActiveTab] = useState('offers'); // 'offers', 'templates', or 'auto-detect'
  const [offers, setOffers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Auto-Detect States
  const [autoDetectStep, setAutoDetectStep] = useState(1); // 1: Upload, 2: Detect, 3: Fill, 4: Preview
  const [autoDetectTemplate, setAutoDetectTemplate] = useState(null);
  const [autoDetectFile, setAutoDetectFile] = useState(null);
  const [autoDetectTemplateName, setAutoDetectTemplateName] = useState('');
  const [detectionResult, setDetectionResult] = useState(null);
  const [autoDetectValues, setAutoDetectValues] = useState({});
  const [autoDetectPreview, setAutoDetectPreview] = useState('');
  const [autoDetectPreviewUrl, setAutoDetectPreviewUrl] = useState('');
  const [originalPdfUrl, setOriginalPdfUrl] = useState('');
  const [autoDetectImageFile, setAutoDetectImageFile] = useState(null);
const [autoDetectImagePreview, setAutoDetectImagePreview] = useState(null);
  const [signaturePos, setSignaturePos] = useState({ x: 20, y: 20 });
  const [signatureSize, setSignatureSize] = useState({ width: 160, height: 60 });
  const previewContainerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, startWidth: 0, startHeight: 0, startX: 0, startY: 0 });
  
  // Persist signature in localStorage so it stays until user deletes it
  const SIGNATURE_STORAGE_KEY = 'offer_letter_signature_v1';
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIGNATURE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.data_url) setAutoDetectImagePreview(parsed.data_url);
        if (parsed?.pos) setSignaturePos(parsed.pos);
        if (parsed?.size) setSignatureSize(parsed.size);
      }
    } catch (e) {
      console.warn('Failed to load persisted signature:', e);
    }
  }, []);

  // Persist whenever preview/pos/size changes
  useEffect(() => {
    try {
      if (autoDetectImagePreview) {
        localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify({ data_url: autoDetectImagePreview, pos: signaturePos, size: signatureSize }));
      }
    } catch (e) {
      // ignore
    }
  }, [autoDetectImagePreview, signaturePos, signatureSize]);

  // Handle window mousemove/mouseup for resizing
  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing || !resizeHandle) return;
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      let newW = resizeStartRef.current.startWidth;
      let newH = resizeStartRef.current.startHeight;
      let newX = resizeStartRef.current.startX;
      let newY = resizeStartRef.current.startY;
      const minW = 24;
      const minH = 16;

      if (resizeHandle.includes('e')) {
        newW = Math.max(minW, resizeStartRef.current.startWidth + dx);
      }
      if (resizeHandle.includes('s')) {
        newH = Math.max(minH, resizeStartRef.current.startHeight + dy);
      }
      if (resizeHandle.includes('w')) {
        newW = Math.max(minW, resizeStartRef.current.startWidth - dx);
        newX = Math.round(resizeStartRef.current.startX + dx);
      }
      if (resizeHandle.includes('n')) {
        newH = Math.max(minH, resizeStartRef.current.startHeight - dy);
        newY = Math.round(resizeStartRef.current.startY + dy);
      }

      setSignatureSize({ width: Math.round(newW), height: Math.round(newH) });
      setSignaturePos({ x: Math.max(0, newX), y: Math.max(0, newY) });
    };

    const onUp = () => {
      if (!isResizing) return;
      setIsResizing(false);
      setResizeHandle(null);
      // persist final size/pos
      try {
        const stored = JSON.parse(localStorage.getItem(SIGNATURE_STORAGE_KEY) || '{}');
        stored.pos = { x: signaturePos.x, y: signaturePos.y };
        stored.size = { width: signatureSize.width, height: signatureSize.height };
        if (stored.data_url || autoDetectImagePreview) stored.data_url = stored.data_url || autoDetectImagePreview;
        localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(stored));
      } catch (err) { /* ignore */ }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, resizeHandle, signaturePos.x, signaturePos.y, signatureSize.width, signatureSize.height, autoDetectImagePreview]);

  const startResize = (handle, e) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeHandle(handle);
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startWidth: signatureSize.width,
      startHeight: signatureSize.height,
      startX: signaturePos.x,
      startY: signaturePos.y,
    };
  };

  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [showViewOfferModal, setShowViewOfferModal] = useState(false);
  const [showAutoDetectModal, setShowAutoDetectModal] = useState(false);
  const [viewingOffer, setViewingOffer] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [formData, setFormData] = useState({
    // Offer Details
    position: '',
    department: '',
    reporting_manager: '',
    location: '',
    employment_type: '',
    working_hours: '',
    offer_date: '',
    
    // Candidate Information
    candidate_name: '',
    candidate_address: '',
    candidate_id: '',
    
    // Company Information (can override placeholders)
    company_name: '',
    company_address: '',
    company_website: '',
    
    // Compensation
    offered_ctc: '',
    annual_ctc: '',
    monthly_ctc: '',
    basic_salary: '',
    hra: '',
    conveyance: '',
    special_allowance: '',
    lta: '',
    other_allowances: '',
    variable_pay: '',
    pf: '',
    esi: '',
    professional_tax: '',
    employee_pf: '',
    
    // Joining Details
    joining_date: '',
    probation_period_months: 3,
    
    // Terms and Conditions
    notice_period_days: 30,
    acceptance_deadline: '',
    terms_and_conditions: '',
    
    // HR and Authorization
    hr_email: '',
    authorized_person: '',
    designation: '',
    
    // Template
    template_id: '',
    // Corner/header design for PDF (1-5)
    corner_design: 1,
    // Document style (font, spacing, corner position)
    corner_position: 'top_right',
    font_family: 'Helvetica',
    font_size_body: 11,
    line_spacing: 1.0
  });

  const CORNER_DESIGNS = [
    { value: 1, label: 'Design 1: Modern Curves', description: 'Orange & blue curved shapes (like KLAREIT style)' },
    { value: 2, label: 'Design 2: Minimal Lines', description: 'Thin angular lines in corner' },
    { value: 3, label: 'Design 3: Geometric', description: 'Overlapping circles and rounded square' },
    { value: 4, label: 'Design 4: Classic', description: 'Subtle corner bracket/frame' },
    { value: 5, label: 'Design 5: Bold Block', description: 'Solid dark block with blue accent' },
  ];

  // Builder: placeholders (logo, company name, address) + preview
  const [placeholders, setPlaceholders] = useState({ company_name: '', company_address: '', logo_url: '' });
  const [orgContext, setOrgContext] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createdOfferFromBuilder, setCreatedOfferFromBuilder] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);


    // Client-side placeholder replacement for live preview
  const replacePlaceholders = (templateContent, data) => {
    if (!templateContent) return '';
    
    let result = templateContent;
    
    // Define all placeholder patterns and their values
    const replacements = {
      // Company Information
      '\\{\\{company_name\\}\\}': data.company_name || '',
      '\\{\\{company\\.name\\}\\}': data.company_name || '',
      '\\[Company_Name\\]': data.company_name || '',
      '\\[Company Name\\]': data.company_name || '',
      '\\[CompanyName\\]': data.company_name || '',
      '\\{\\{company_address\\}\\}': data.company_address || '',
      '\\{\\{company\\.address\\}\\}': data.company_address || '',
      '\\[Company_Address\\]': data.company_address || '',
      '\\[Company Address\\]': data.company_address || '',
      '\\[CompanyAddress\\]': data.company_address || '',
      '\\{\\{company_website\\}\\}': data.company_website || '',
      '\\{\\{company\\.website\\}\\}': data.company_website || '',
      '\\[Company_Website\\]': data.company_website || '',
      '\\[Company Website\\]': data.company_website || '',
      '\\[CompanyWebsite\\]': data.company_website || '',
      
      // Candidate Information
      '\\{\\{candidate_name\\}\\}': data.candidate_name || '',
      '\\{\\{candidate\\.name\\}\\}': data.candidate_name || '',
      '\\[Employee_Name\\]': data.candidate_name || '',
      '\\[Employee Name\\]': data.candidate_name || '',
      '\\[EmployeeName\\]': data.candidate_name || '',
      '\\[Candidate_Name\\]': data.candidate_name || '',
      '\\[Candidate Name\\]': data.candidate_name || '',
      '\\[CandidateName\\]': data.candidate_name || '',
      '\\{\\{candidate_address\\}\\}': data.candidate_address || '',
      '\\{\\{candidate\\.address\\}\\}': data.candidate_address || '',
      '\\[Candidate_Address\\]': data.candidate_address || '',
      '\\[Candidate Address\\]': data.candidate_address || '',
      '\\[CandidateAddress\\]': data.candidate_address || '',
      
      // Job Details
      '\\{\\{job_title\\}\\}': data.position || '',
      '\\{\\{job\\.title\\}\\}': data.position || '',
      '\\{\\{position\\}\\}': data.position || '',
      '\\[Job_Title\\]': data.position || '',
      '\\[Job Title\\]': data.position || '',
      '\\[JobTitle\\]': data.position || '',
      '\\[Position\\]': data.position || '',
      '\\{\\{department\\}\\}': data.department || '',
      '\\[Department\\]': data.department || '',
      '\\{\\{manager_name\\}\\}': data.reporting_manager || '',
      '\\{\\{manager\\.name\\}\\}': data.reporting_manager || '',
      '\\{\\{reporting_manager\\}\\}': data.reporting_manager || '',
      '\\{\\{reporting\\.manager\\}\\}': data.reporting_manager || '',
      '\\[Manager_Name\\]': data.reporting_manager || '',
      '\\[Manager Name\\]': data.reporting_manager || '',
      '\\[ManagerName\\]': data.reporting_manager || '',
      '\\[Reporting_Manager\\]': data.reporting_manager || '',
      '\\[Reporting Manager\\]': data.reporting_manager || '',
      '\\[ReportingManager\\]': data.reporting_manager || '',
      '\\{\\{location\\}\\}': data.location || '',
      '\\{\\{office_location\\}\\}': data.location || '',
      '\\{\\{office\\.location\\}\\}': data.location || '',
      '\\[Location\\]': data.location || '',
      '\\[Office_Location\\]': data.location || '',
      '\\[Office Location\\]': data.location || '',
      '\\[OfficeLocation\\]': data.location || '',
      '\\{\\{employment_type\\}\\}': data.employment_type || '',
      '\\{\\{employment\\.type\\}\\}': data.employment_type || '',
      '\\[Employment_Type\\]': data.employment_type || '',
      '\\[Employment Type\\]': data.employment_type || '',
      '\\[EmploymentType\\]': data.employment_type || '',
      '\\{\\{working_hours\\}\\}': data.working_hours || '',
      '\\{\\{working\\.hours\\}\\}': data.working_hours || '',
      '\\[Working_Hours\\]': data.working_hours || '',
      '\\[Working Hours\\]': data.working_hours || '',
      '\\[WorkingHours\\]': data.working_hours || '',
      
      // Dates
      '\\{\\{offer_date\\}\\}': data.offer_date || '',
      '\\{\\{offer\\.date\\}\\}': data.offer_date || '',
      '\\{\\{date\\}\\}': data.offer_date || '',
      '\\[Offer_Date\\]': data.offer_date || '',
      '\\[Offer Date\\]': data.offer_date || '',
      '\\[OfferDate\\]': data.offer_date || '',
      '\\[Date\\]': data.offer_date || '',
      '\\{\\{joining_date\\}\\}': data.joining_date || '',
      '\\{\\{joining\\.date\\}\\}': data.joining_date || '',
      '\\[Joining_Date\\]': data.joining_date || '',
      '\\[Joining Date\\]': data.joining_date || '',
      '\\[JoiningDate\\]': data.joining_date || '',
      '\\{\\{acceptance_deadline\\}\\}': data.acceptance_deadline || '',
      '\\{\\{acceptance\\.deadline\\}\\}': data.acceptance_deadline || '',
      '\\[Acceptance_Deadline\\]': data.acceptance_deadline || '',
      '\\[Acceptance Deadline\\]': data.acceptance_deadline || '',
      '\\[AcceptanceDeadline\\]': data.acceptance_deadline || '',
      
      // Compensation (format numbers with currency)
      '\\{\\{annual_ctc\\}\\}': data.annual_ctc ? `₹${parseFloat(data.annual_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\{\\{annual\\.ctc\\}\\}': data.annual_ctc ? `₹${parseFloat(data.annual_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[Annual_CTC\\]': data.annual_ctc ? `₹${parseFloat(data.annual_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[Annual CTC\\]': data.annual_ctc ? `₹${parseFloat(data.annual_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[AnnualCTC\\]': data.annual_ctc ? `₹${parseFloat(data.annual_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[CTC\\]': data.offered_ctc ? `₹${parseFloat(data.offered_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\{\\{monthly_ctc\\}\\}': data.monthly_ctc ? `₹${parseFloat(data.monthly_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\{\\{monthly\\.ctc\\}\\}': data.monthly_ctc ? `₹${parseFloat(data.monthly_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[Monthly_CTC\\]': data.monthly_ctc ? `₹${parseFloat(data.monthly_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[Monthly CTC\\]': data.monthly_ctc ? `₹${parseFloat(data.monthly_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[MonthlyCTC\\]': data.monthly_ctc ? `₹${parseFloat(data.monthly_ctc).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\{\\{basic_salary\\}\\}': data.basic_salary ? `₹${parseFloat(data.basic_salary).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\{\\{basic\\.salary\\}\\}': data.basic_salary ? `₹${parseFloat(data.basic_salary).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[Basic_Salary\\]': data.basic_salary ? `₹${parseFloat(data.basic_salary).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[Basic Salary\\]': data.basic_salary ? `₹${parseFloat(data.basic_salary).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[BasicSalary\\]': data.basic_salary ? `₹${parseFloat(data.basic_salary).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\{\\{hra\\}\\}': data.hra ? `₹${parseFloat(data.hra).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      '\\[HRA\\]': data.hra ? `₹${parseFloat(data.hra).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      
      // Add custom placeholders that might be in your template
      '\\{\\{net_pay_annually\\}\\}': data.net_pay_annually || '',
      '\\{\\{net_pay_monthly\\}\\}': data.net_pay_monthly || '',
      '\\{\\{other_annual\\}\\}': data.other_annual || '',
      '\\{\\{other_monthly\\}\\}': data.other_monthly || '',
    };
    
    // Replace all placeholders (case-insensitive)
    Object.keys(replacements).forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      result = result.replace(regex, replacements[pattern]);
    });
    
    // DYNAMIC PLACEHOLDER REPLACEMENT: Handle any additional fields from data
    // This catches custom placeholders that weren't in the standard list
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && !['template_content', 'logo_url'].includes(key)) {
        let formattedValue = String(data[key]);
        
        // Format numeric values with currency (except for period fields)
        if (typeof data[key] === 'number' && !['probation_period_months', 'notice_period_days'].includes(key)) {
          try {
            formattedValue = `₹${parseFloat(data[key]).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          } catch (e) {
            formattedValue = String(data[key]);
          }
        }
        
        // Create pattern variations
        const keyVariations = [
          key,  // net_pay_annually
          key.replace(/_/g, '.'),  // net.pay.annually
          key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_'),  // Net_Pay_Annually
          key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''),  // NetPayAnnually
          key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),  // Net Pay Annually
        ];
        
        keyVariations.forEach(keyVar => {
          // Replace {{key}}, [Key], [Key_Name], etc.
          const patterns = [
            new RegExp(`\\{\\{${keyVar}\\}\\}`, 'gi'),
            new RegExp(`\\{\\{${keyVar.toLowerCase()}\\}\\}`, 'gi'),
            new RegExp(`\\[${keyVar}\\]`, 'gi'),
            new RegExp(`\\[${keyVar.replace(/_/g, ' ')}\\]`, 'gi'),
          ];
          
          patterns.forEach(pattern => {
            result = result.replace(pattern, formattedValue);
          });
        });
      }
    });
    
    return result;
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showForm) {
      offerLetterAPI.getOrgContext().then((data) => {
        setOrgContext(data);
        // Set placeholders from org context
        const newPlaceholders = {
          company_name: data?.company_name || '',
          company_address: data?.company_address || '',
          logo_url: data?.logo_url || '',
        };
        setPlaceholders(newPlaceholders);
        // Also set in formData for company override fields
        setFormData(prev => ({
          ...prev,
          company_name: prev.company_name || data?.company_name || '',
          company_address: prev.company_address || data?.company_address || '',
          company_website: prev.company_website || '',
        }));
      }).catch((err) => {
        console.error('Failed to load org context:', err);
      });
    }
  }, [showForm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersData, employeesData, templatesData, candidatesData] = await Promise.all([
        offerLetterAPI.getOfferLetters(),
        employeeAPI.getAll(),
        offerLetterAPI.getTemplates().catch(() => []),
        recruitmentAPI.getCandidates().catch(() => [])
      ]);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setCandidates(Array.isArray(candidatesData) ? candidatesData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load offer letters');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If candidate_id is selected, populate candidate_name from candidate data
    if (name === 'candidate_id' && value) {
      const selectedCandidate = candidates.find(c => String(c.candidate_id) === String(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        candidate_name: selectedCandidate ? `${selectedCandidate.first_name} ${selectedCandidate.last_name}` : prev.candidate_name
      }));
      return;
    }
    
    // When Annual CTC is entered, auto-populate Monthly CTC, Professional Tax, Employer PF, Employee PF
    if (name === 'annual_ctc' && value !== '' && !isNaN(parseFloat(value))) {
      const annual = parseFloat(value);
      const monthlyCtc = (annual / 12).toFixed(2);
      setFormData(prev => ({
        ...prev,
        annual_ctc: value,
        offered_ctc: value,
        monthly_ctc: monthlyCtc,
        professional_tax: '200',
        pf: '1800',
        employee_pf: '1800',
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceholderChange = (field, value) => {
    setPlaceholders((p) => ({ ...p, [field]: value }));
  };

  const loadOrgDefaults = () => {
    if (!orgContext) return;
    setPlaceholders({
      company_name: orgContext.company_name || '',
      company_address: orgContext.company_address || '',
      logo_url: orgContext.logo_url || '',
    });
  };

  const buildPreviewPayload = () => {
    const hasCandidate = formData.candidate_id && String(formData.candidate_id).trim() !== '';
    const c = hasCandidate ? candidates.find((x) => String(x.candidate_id) === String(formData.candidate_id)) : null;
    const candidateName = c ? `${c.first_name} ${c.last_name}` : (formData.candidate_name?.trim() || 'Candidate');
    const toNum = (v) => (v === '' || v == null ? 0 : Number(v));
    const toInt = (v, d) => (v === '' || v == null ? d : parseInt(v, 10));
    const sel = formData.template_id ? templates.find((t) => String(t.template_id) === String(formData.template_id)) : null;
    
    // Start with all formData (includes any custom fields like net_pay_annually, etc.)
    const payload = {};
    
    // Add all fields from formData first (to capture custom fields)
    Object.keys(formData).forEach(key => {
      if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
        payload[key] = formData[key];
      }
    });
    
    // Then override with specific processed values
    Object.assign(payload, {
      template_id: formData.template_id ? parseInt(formData.template_id, 10) : null,
      template_content: sel?.template_content || null,
      // Company info: prefer formData override, then placeholders, then org context
      company_name: formData.company_name || placeholders.company_name || orgContext?.company_name || undefined,
      company_address: formData.company_address || placeholders.company_address || orgContext?.company_address || undefined,
      company_website: formData.company_website || undefined,
      logo_url: placeholders.logo_url || orgContext?.logo_url || undefined,
      candidate_name: candidateName,
      candidate_address: formData.candidate_address || undefined,
      position: formData.position || '',
      department: formData.department || '',
      reporting_manager: formData.reporting_manager || '',
      location: formData.location || '',
      employment_type: formData.employment_type || undefined,
      working_hours: formData.working_hours || undefined,
      joining_date: formData.joining_date || '',
      offer_date: formData.offer_date && formData.offer_date.trim() ? formData.offer_date : undefined,
      probation_period_months: toInt(formData.probation_period_months, 3),
      notice_period_days: toInt(formData.notice_period_days, 30),
      acceptance_deadline: formData.acceptance_deadline && formData.acceptance_deadline.trim() ? formData.acceptance_deadline : undefined,
      offered_ctc: (formData.annual_ctc && formData.annual_ctc !== '') 
        ? toNum(formData.annual_ctc) 
        : toNum(formData.offered_ctc),
      annual_ctc: (formData.annual_ctc && formData.annual_ctc !== '') 
        ? toNum(formData.annual_ctc) 
        : (formData.offered_ctc && formData.offered_ctc !== '' ? toNum(formData.offered_ctc) : 0),
      monthly_ctc: toNum(formData.monthly_ctc),
      basic_salary: toNum(formData.basic_salary),
      hra: toNum(formData.hra),
      conveyance: toNum(formData.conveyance),
      special_allowance: toNum(formData.special_allowance),
      lta: toNum(formData.lta),
      other_allowances: toNum(formData.other_allowances),
      variable_pay: toNum(formData.variable_pay),
      pf: toNum(formData.pf),
      esi: toNum(formData.esi),
      terms_and_conditions: formData.terms_and_conditions || undefined,
      hr_email: formData.hr_email || undefined,
      authorized_person: formData.authorized_person || undefined,
      designation: formData.designation || undefined,
      corner_design: formData.corner_design ? parseInt(formData.corner_design, 10) : 1,
      corner_position: formData.corner_position || 'top_right',
      font_family: formData.font_family || 'Helvetica',
      font_size_body: formData.font_size_body != null ? parseInt(formData.font_size_body, 10) : 11,
      line_spacing: formData.line_spacing != null ? parseFloat(formData.line_spacing) : 1.0,
    });
    
    return payload;
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setError(null);
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    try {
      const payload = buildPreviewPayload();
      const blob = await offerLetterAPI.previewPdf(payload);
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewText('');
      setShowPreviewModal(true);
    } catch (err) {
      console.error('Preview failed:', err);
      setError(err?.response?.data?.detail || 'Failed to preview offer letter');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewModal = () => {
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    setShowPreviewModal(false);
    setPreviewText('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      // Coerce types to match backend schema (floats/ints/date) and avoid sending empty strings
      const toNumberOrZero = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
      const toIntOrDefault = (v, d) => (v === '' || v === null || v === undefined ? d : parseInt(v, 10));
      const toOptionalString = (v) => (v === '' || v === null || v === undefined ? undefined : v);

      const payload = {
        // Offer Details
        position: (formData.position || '').trim(),
        department: (formData.department || '').trim(),
        reporting_manager: toOptionalString(formData.reporting_manager),
        location: toOptionalString(formData.location),
        employment_type: toOptionalString(formData.employment_type),
        working_hours: toOptionalString(formData.working_hours),
        offer_date: formData.offer_date && formData.offer_date.trim() ? formData.offer_date : undefined,
        
        // Candidate Information
        candidate_name: toOptionalString(formData.candidate_name),
        candidate_address: toOptionalString(formData.candidate_address),
        
        // Company Information
        company_name: toOptionalString(formData.company_name),
        company_address: toOptionalString(formData.company_address),
        company_website: toOptionalString(formData.company_website),
        
        // Compensation
        // Handle CTC: prefer annual_ctc if set, otherwise use offered_ctc
        offered_ctc: (formData.annual_ctc && formData.annual_ctc !== '') 
          ? toNumberOrZero(formData.annual_ctc) 
          : toNumberOrZero(formData.offered_ctc),
        annual_ctc: (formData.annual_ctc && formData.annual_ctc !== '') 
          ? toNumberOrZero(formData.annual_ctc) 
          : (formData.offered_ctc && formData.offered_ctc !== '' ? toNumberOrZero(formData.offered_ctc) : 0),
        monthly_ctc: toNumberOrZero(formData.monthly_ctc),
        basic_salary: toNumberOrZero(formData.basic_salary),
        hra: toNumberOrZero(formData.hra),
        conveyance: toNumberOrZero(formData.conveyance),
        special_allowance: toNumberOrZero(formData.special_allowance),
        lta: toNumberOrZero(formData.lta),
        other_allowances: toNumberOrZero(formData.other_allowances),
        variable_pay: toNumberOrZero(formData.variable_pay),
        pf: toNumberOrZero(formData.pf),
        esi: toNumberOrZero(formData.esi),
        
        // Joining Details
        joining_date: formData.joining_date, // "YYYY-MM-DD" from input[type=date]
        probation_period_months: toIntOrDefault(formData.probation_period_months, 3),
        
        // Terms and Conditions
        notice_period_days: toIntOrDefault(formData.notice_period_days, 30),
        acceptance_deadline: formData.acceptance_deadline && formData.acceptance_deadline.trim() ? formData.acceptance_deadline : undefined,
        terms_and_conditions: toOptionalString(formData.terms_and_conditions),
        
        // HR and Authorization
        hr_email: toOptionalString(formData.hr_email),
        authorized_person: toOptionalString(formData.authorized_person),
        designation: toOptionalString(formData.designation),
        
        // Template and Candidate
        template_id: formData.template_id ? parseInt(formData.template_id, 10) : undefined,
        candidate_id: formData.candidate_id ? parseInt(formData.candidate_id, 10) : undefined,
        corner_design: formData.corner_design ? parseInt(formData.corner_design, 10) : 1,
      };

      // If candidate_id is set but candidate_name is not, populate it from candidate data
      if (payload.candidate_id && !payload.candidate_name) {
        const selectedCandidate = candidates.find(c => String(c.candidate_id) === String(payload.candidate_id));
        if (selectedCandidate) {
          payload.candidate_name = `${selectedCandidate.first_name} ${selectedCandidate.last_name}`;
        }
      }

      console.log('Creating offer letter with payload:', payload);
      console.log('Payload keys:', Object.keys(payload));
      const created = await offerLetterAPI.createOfferLetter(payload);
      console.log('Created offer letter:', created);
      await fetchData();
      setCreatedOfferFromBuilder(created);
      setError(null);
    } catch (err) {
      console.error('Error creating offer:', err);
      console.error('Error response:', err?.response?.data);
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e) => `${e.loc?.join('.') || e.field || 'field'}: ${e.msg || e.message}`).join(' | '));
      } else if (typeof detail === 'string') {
        let msg = detail;
        if (detail === 'Candidate not found') {
          msg = 'Candidate not found. Add candidates in Recruitment first, or choose "No candidate" and enter the recipient name manually.';
        }
        setError(msg);
      } else {
        setError(err?.response?.data?.message || err?.message || 'Failed to create offer letter');
      }
    }
  };

  const handleGeneratePDF = async (offerId, overrides = null) => {
    try {
      const updated = await offerLetterAPI.generatePDF(offerId, overrides);
      await fetchData();
      if (createdOfferFromBuilder && Number(createdOfferFromBuilder.offer_id) === Number(offerId)) {
        setCreatedOfferFromBuilder(updated);
      }
      alert('PDF generated successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err?.response?.data?.detail || 'Failed to generate PDF');
    }
  };

  const handleGeneratePDFFromBuilder = async () => {
    if (!createdOfferFromBuilder) return;
    setError(null);
    try {
      const overrides = {};
      if (placeholders.company_name) overrides.company_name = placeholders.company_name;
      if (placeholders.company_address) overrides.company_address = placeholders.company_address;
      if (placeholders.logo_url) overrides.logo_url = placeholders.logo_url;
      if (!formData.candidate_id && formData.candidate_name?.trim()) overrides.candidate_name = formData.candidate_name.trim();
      if (formData.corner_design) overrides.corner_design = parseInt(formData.corner_design, 10);
      if (formData.corner_position) overrides.corner_position = formData.corner_position;
      if (formData.font_family) overrides.font_family = formData.font_family;
      if (formData.font_size_body != null) overrides.font_size_body = parseInt(formData.font_size_body, 10);
      if (formData.line_spacing != null) overrides.line_spacing = parseFloat(formData.line_spacing);
      await handleGeneratePDF(createdOfferFromBuilder.offer_id, Object.keys(overrides).length ? overrides : null);
    } catch (e) {
      // handleGeneratePDF sets error
    }
  };

  const handleDownloadFromBuilder = () => {
    if (!createdOfferFromBuilder?.offer_id) return;
    handleDownloadPDF(createdOfferFromBuilder.offer_id);
  };

  const handleDownloadPDF = async (offerId) => {
    try {
      toast.info('📥 Starting PDF download...');
      const blobData = await offerLetterAPI.downloadPDF(offerId);
      
      // Validate blob
      if (!blobData || blobData.size === 0) {
        throw new Error('Received empty or invalid PDF file');
      }
      
      console.log(`[Download] Received blob size: ${blobData.size} bytes`);
      
      const blob = new Blob([blockData],{type: 'application/pdf'});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offer_letter_${offerId}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a delay to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      // Show success message
      toast.success('✅ PDF downloaded successfully!');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      console.error('Error details:', err?.response);
      
      // Parse error message
      let errorMsg = 'Failed to download PDF';
      if (err?.response?.status === 404) {
        errorMsg = 'PDF not generated yet. Please generate the PDF first.';
      } else if (err?.response?.status === 403) {
        errorMsg = 'Access denied. You do not have permission to download this PDF.';
      } else if (err?.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    }
  };

  const handleSend = async (offerId) => {
    if (!window.confirm('Send this offer letter to the candidate?')) return;
    try {
      await offerLetterAPI.sendOfferLetter(offerId);
      await fetchData();
      alert('Offer letter sent successfully!');
    } catch (err) {
      console.error('Error sending offer:', err);
      setError(err.response?.data?.detail || 'Failed to send offer letter');
    }
  };

  const handleLinkPayroll = async (offerId) => {
    const employeeId = prompt('Enter Employee ID to link:');
    if (!employeeId) return;
    try {
      await offerLetterAPI.linkToPayroll(offerId, parseInt(employeeId));
      await fetchData();
      alert('Offer letter linked to payroll successfully!');
    } catch (err) {
      console.error('Error linking to payroll:', err);
      setError(err.response?.data?.detail || 'Failed to link to payroll');
    }
  };

  const handleDelete = async (offerId, offerNumber) => {
    if (!window.confirm(`Are you sure you want to delete offer letter ${offerNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      await offerLetterAPI.deleteOfferLetter(offerId);
      await fetchData();
      alert('Offer letter deleted successfully!');
    } catch (err) {
      console.error('Error deleting offer letter:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to delete offer letter';
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  // Template Management Functions
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    description: '',
    template_content: '',
    company_name: '',
    company_address: '',
    logo_url: '',
    is_default: false
  });

  const handleTemplateInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTemplateForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await offerLetterAPI.createTemplate(templateForm);
      await fetchData();
      setShowTemplateModal(false);
      resetTemplateForm();
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err.response?.data?.detail || 'Failed to create template');
    }
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await offerLetterAPI.updateTemplate(editingTemplate.template_id, templateForm);
      await fetchData();
      setShowTemplateModal(false);
      setEditingTemplate(null);
      resetTemplateForm();
    } catch (err) {
      console.error('Error updating template:', err);
      setError(err.response?.data?.detail || 'Failed to update template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      template_name: template.template_name,
      description: template.description || '',
      template_content: template.template_content,
      company_name: template.company_name || '',
      company_address: template.company_address || '',
      logo_url: template.logo_url || '',
      is_default: template.is_default || false
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await offerLetterAPI.deleteTemplate(templateId);
      await fetchData();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err.response?.data?.detail || 'Failed to delete template');
    }
  };

  const handleUploadPdf = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a PDF file');
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await offerLetterAPI.uploadPdfTemplate(
        uploadFile,
        templateForm.template_name,
        templateForm.description,
        templateForm.company_name,
        templateForm.company_address
      );
      await fetchData();
      setShowUploadModal(false);
      setUploadFile(null);
      resetTemplateForm();
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setError(err.response?.data?.detail || 'Failed to upload PDF template');
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      template_name: '',
      description: '',
      template_content: '',
      company_name: '',
      company_address: '',
      logo_url: '',
      is_default: false
    });
    setEditingTemplate(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  
  const handleGeneratePreviewWithDelay = async () => {
  if (generatingPreview) return;

  setGeneratingPreview(true);

  // intentional UX delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    await handleAutoDetectGeneratePreview();
  } finally {
    setGeneratingPreview(false);
  }
};

  const handleAutoDetectGeneratePreview = async () => {
  if (!detectionResult?.template_id) {
    toast.error('Template ID missing. Please re-detect placeholders.');
    return;
  }

  if (!autoDetectValues || Object.keys(autoDetectValues).length === 0) {
    toast.error('No placeholder values entered');
    return;
  }

  console.log('Preview payload:', {
    template_id: detectionResult.template_id,
    values: autoDetectValues,
  });

  try {
    const blob = await offerLetterAPI.previewWithValues({
      template_id: detectionResult.template_id,
      values: autoDetectValues,
    });

    const url = window.URL.createObjectURL(blob);
    setAutoDetectPreviewUrl(url);
    toast.success('✅ Preview updated!');
  } catch (e) {
    console.error(e);
    toast.error(e.response?.data?.detail || e.message);
  }
};

  const handleAutoDetectImageUpload = (e) => {
  const file = e.target ? e.target.files && e.target.files[0] : e;

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast.error('Only image files are allowed');
    return;
  }

  // Optional: limit size (3MB recommended)
  if (file.size > 3 * 1024 * 1024) {
    toast.error('Image must be less than 3MB');
    return;
  }

  // Read file as data URL for persistence and preview
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;

    // Revoke old preview if exists
    if (autoDetectImagePreview && autoDetectImagePreview.startsWith('blob:')) {
      try { window.URL.revokeObjectURL(autoDetectImagePreview); } catch (e) {}
    }

    setAutoDetectImageFile(null); // we store data URL instead of File
    setAutoDetectImagePreview(dataUrl);

    // Persist signature data
    try {
      localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify({ data_url: dataUrl, pos: signaturePos, size: signatureSize }));
    } catch (e) {
      console.warn('Could not persist signature:', e);
    }
  };
  reader.readAsDataURL(file);
};

  const handleAutoDetectImageDelete = () => {
  if (autoDetectImagePreview) {
    if (autoDetectImagePreview && autoDetectImagePreview.startsWith('blob:')) {
      try { window.URL.revokeObjectURL(autoDetectImagePreview); } catch (e) {}
    }
  }
  setAutoDetectImageFile(null);
  setAutoDetectImagePreview(null);
  setSignaturePos({ x: 20, y: 20 });
  setSignatureSize({ width: 160, height: 60 });
  try { localStorage.removeItem(SIGNATURE_STORAGE_KEY); } catch (e) {}
};


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Offer Letters</h1>
        {activeTab === 'offers' && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#ffbd59] text-white px-4 py-2 rounded-lg hover:bg-[#ffbd59] flex items-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            Create Offer Letter
          </button>
        )}
        {activeTab === 'templates' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetTemplateForm();
                setShowUploadModal(true);
              }}
              className="bg-[#ffbd59] text-white px-4 py-2 rounded-lg hover:bg-[#ffbd59] flex items-center gap-2"
            >
              <FiUpload className="w-5 h-5" />
              Upload PDF Template
            </button>
            {/* <button
              onClick={() => {
                resetTemplateForm();
                setShowTemplateModal(true);
              }}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2"
            >
              <FiPlus className="w-5 h-5" />
              Create Template
            </button> */}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('offers'); setShowForm(false); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'offers'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Offer Letters
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No templates found. Create or upload a template to get started.</p>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto-left grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                
                <div key={template.template_id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                    {/* <span className="text-teal-600 font-medium mt-1">Placeholders: {template.placeholders_count || 49}</span> */}
                    {template.is_default && (
                      <span className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded">Default</span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}
                  <div className="text-xs text-gray-500 mb-4">
                    <p>Source: {template.source_type === 'pdf_extracted' ? 'PDF Upload' : 'Manual'}</p>
                    <p>Created: {new Date(template.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setViewingTemplate(template);
                        setShowViewModal(true);
                      }}
                      className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 text-sm"
                    >
                      <FiEye className="w-4 h-4" />
                      View
                    </button>
                    {/* <button
                      onClick={() => window.open(`/api/templates/${template.template_id}/original`, '_blank')}
                      className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 text-sm"
                    >
                      <FiDownload className="w-4 h-4" />
                      Original
                    </button> */}
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 flex items-center gap-1 text-sm"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </button>
                    {/* <button
                      onClick={async () => {
                        try {
                          // Detect placeholders first, then go to edit step
                          console.log('Detecting placeholders for template:', template.template_id, template.template_name);
                          const response = await offerLetterAPI.detectAndSuggestPlaceholders(template.template_id);
                          setAutoDetectTemplate(template);
                          setDetectionResult(response);
                          setAutoDetectValues({});
                          setAutoDetectPreview('');
                          setAutoDetectPreviewUrl('');
                          setAutoDetectStep(2);
                          setShowAutoDetectModal(true);
                          toast.success(`✅ Detected ${response.detected_count} placeholders!`);
                        } catch (error) {
                          console.error('Error detecting placeholders:', error);
                          const errorMsg = error.response?.status === 404 
                            ? `Template not found (ID: ${template.template_id}). It may have been deleted.`
                            : error.response?.data?.detail || error.message;
                          toast.error('❌ ' + errorMsg);
                        }
                      }}
                      className="px-3 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded hover:bg-purple-100 flex items-center gap-1 text-sm"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit Placeholders
                    </button> */}
                    <button
                      onClick={() => {
                        setAutoDetectTemplate(template);
                        setAutoDetectStep(1);
                        setDetectionResult(null);
                        setAutoDetectValues({});
                        setAutoDetectPreview('');
                        setAutoDetectPreviewUrl('');
                        setShowAutoDetectModal(true);
                      }}
                      className="px-3 py-2 bg-teal-50 text-teal-600 border border-teal-200 rounded hover:bg-teal-100 flex items-center gap-1 text-sm"
                    >
                      🔍 Auto-detect
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.template_id)}
                      className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offer Letters Tab */}
      {activeTab === 'offers' && showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create Offer Letter</h2>

          {/* Placeholders: Logo, Company Name, Address */}
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <FiImage className="w-4 h-4" />
              Placeholders (used in preview & PDF)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={placeholders.company_name}
                  onChange={(e) => handlePlaceholderChange('company_name', e.target.value)}
                  placeholder="e.g. Acme Inc."
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                <textarea
                  value={placeholders.company_address}
                  onChange={(e) => handlePlaceholderChange('company_address', e.target.value)}
                  placeholder="Address, city, state, PIN"
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  rows="2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={placeholders.logo_url}
                  onChange={(e) => handlePlaceholderChange('logo_url', e.target.value)}
                  placeholder="/uploads/logos/... or full URL (e.g., https://example.com/logo.png)"
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use full URL (https://...) or relative path (/uploads/logos/...). 
                  {orgContext?.logo_url && (
                    <span className="text-blue-600"> Current org logo: {orgContext.logo_url}</span>
                  )}
                </p>
              </div>
              {orgContext && (orgContext.company_name || orgContext.logo_url) && (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={loadOrgDefaults}
                    className="text-sm text-amber-700 hover:text-amber-900 font-medium"
                  >
                    Use organization defaults
                  </button>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Candidate Selection */}
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Candidate (optional)
              </label>
              <select
                name="candidate_id"
                value={formData.candidate_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option value="">-- No candidate (enter name manually) --</option>
                {candidates.map((candidate) => (
                  <option key={candidate.candidate_id} value={candidate.candidate_id}>
                    {candidate.first_name} {candidate.last_name} {candidate.email ? `(${candidate.email})` : ''}
                  </option>
                ))}
              </select>
              {(!formData.candidate_id || String(formData.candidate_id).trim() === '') && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Recipient name</label>
                  <input
                    type="text"
                    name="candidate_name"
                    value={formData.candidate_name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              )}
              <p className="text-xs text-gray-600 mt-2">
                Choose a recruitment candidate or leave empty and enter the recipient name manually. Add candidates in Recruitment if needed.
              </p>
            </div>

            {/* Template Selector */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template (Optional)
              </label>
              <select
                name="template_id"
                value={formData.template_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option value="">No Template (use default layout)</option>
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.template_name} {template.is_default && '(Default)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                Selecting a template will link it to this offer letter. The template will be used when generating the PDF.
              </p>
            </div>

            {/* Corner / Header Design */}
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Corner / header design (PDF)
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Choose the decorative design shown at the top-right corner and footer of the offer letter PDF.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CORNER_DESIGNS.map((d) => (
                  <label
                    key={d.value}
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      Number(formData.corner_design) === d.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="corner_design"
                      value={d.value}
                      checked={Number(formData.corner_design) === d.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span className="font-medium text-gray-900">{d.label}</span>
                    <span className="text-xs text-gray-600 mt-1">{d.description}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Document style: font, spacing, corner position */}
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Document style (PDF)</h3>
              <p className="text-xs text-gray-600 mb-4">
                Edit how the offer letter looks: font, font size, line spacing, and where the corner design appears.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corner design position</label>
                  <select
                    name="corner_position"
                    value={formData.corner_position || 'top_right'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="top_right">Top right</option>
                    <option value="top_left">Top left</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
                  <select
                    name="font_family"
                    value={formData.font_family || 'Helvetica'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times-Roman">Times Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font size (body)</label>
                  <select
                    name="font_size_body"
                    value={formData.font_size_body ?? 11}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value={9}>9 pt</option>
                    <option value={10}>10 pt</option>
                    <option value={11}>11 pt</option>
                    <option value={12}>12 pt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Line spacing</label>
                  <select
                    name="line_spacing"
                    value={formData.line_spacing ?? 1.0}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value={1.0}>1.0 (normal)</option>
                    <option value={1.2}>1.2</option>
                    <option value={1.5}>1.5</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Offer Details Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Employment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position/Job Title *</label>
                  <input type="text" name="position" value={formData.position} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
                  <select
                    name="reporting_manager"
                    value={formData.reporting_manager}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Select Manager --</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={`${emp.first_name} ${emp.last_name}`}>
                        {emp.first_name} {emp.last_name} {emp.department ? `(${emp.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select name="employment_type" value={formData.employment_type} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">-- Select --</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                  <input type="text" name="working_hours" value={formData.working_hours} onChange={handleInputChange} placeholder="e.g., 9:00 AM - 6:00 PM" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Date</label>
                  <input type="date" name="offer_date" value={formData.offer_date} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                  <input type="date" name="joining_date" value={formData.joining_date} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Probation Period (Months)</label>
                  <input type="number" name="probation_period_months" value={formData.probation_period_months} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Days)</label>
                  <input type="number" name="notice_period_days" value={formData.notice_period_days} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Deadline</label>
                  <input type="date" name="acceptance_deadline" value={formData.acceptance_deadline} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            {/* Candidate Address */}
            {(!formData.candidate_id || String(formData.candidate_id).trim() === '') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Address</label>
                <textarea
                  name="candidate_address"
                  value={formData.candidate_address}
                  onChange={handleInputChange}
                  placeholder="Full address of the candidate"
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>
            )}

            {/* Company Information Override */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information (Optional Override)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Leave empty to use placeholder value" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
                  <input type="text" name="company_website" value={formData.company_website} onChange={handleInputChange} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                  <textarea name="company_address" value={formData.company_address} onChange={handleInputChange} placeholder="Leave empty to use placeholder value" className="w-full px-3 py-2 border rounded-lg" rows="2" />
                </div>
              </div>
            </div>

            {/* Compensation Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Compensation & Benefits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual CTC (₹) *</label>
                  <input type="number" name="annual_ctc" value={formData.annual_ctc} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly CTC (₹)</label>
                  <input type="number" name="monthly_ctc" value={formData.monthly_ctc} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offered CTC (₹) *</label>
                  <input type="number" name="offered_ctc" value={formData.offered_ctc} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" required />
                  <p className="text-xs text-gray-500 mt-1">Used for backward compatibility</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary (₹) *</label>
                  <input type="number" name="basic_salary" value={formData.basic_salary} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HRA (₹)</label>
                  <input type="number" name="hra" value={formData.hra} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conveyance Allowance (₹)</label>
                  <input type="number" name="conveyance" value={formData.conveyance} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Allowance (₹)</label>
                  <input type="number" name="special_allowance" value={formData.special_allowance} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LTA (₹)</label>
                  <input type="number" name="lta" value={formData.lta} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowances (₹)</label>
                  <input type="number" name="other_allowances" value={formData.other_allowances} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variable Pay (₹)</label>
                  <input type="number" name="variable_pay" value={formData.variable_pay} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Professional Tax (₹)</label>
                  <input type="number" name="professional_tax" value={formData.professional_tax} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" placeholder="Auto: 200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Employer PF (₹)</label>
                  <input type="number" name="pf" value={formData.pf} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" placeholder="Auto: 1800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Employee PF (₹)</label>
                  <input type="number" name="employee_pf" value={formData.employee_pf} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" placeholder="Auto: 1800" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ESI (Employer) (₹)</label>
                  <input type="number" name="esi" value={formData.esi} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" />
                </div>
              </div>
            </div>

            {/* HR and Authorization */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">HR & Authorization</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HR Email</label>
                  <input type="email" name="hr_email" value={formData.hr_email} onChange={handleInputChange} placeholder="hr@company.com" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Person</label>
                  <input type="text" name="authorized_person" value={formData.authorized_person} onChange={handleInputChange} placeholder="Name of person signing" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} placeholder="Designation of authorized person" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" rows="4" />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {!createdOfferFromBuilder ? (
                <>
                  <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700">
                    Save as draft
                  </button>
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewLoading || !formData.position}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {previewLoading ? 'Loading…' : 'Preview offer letter'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setCreatedOfferFromBuilder(null); setPlaceholders({ company_name: '', company_address: '', logo_url: '' }); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-green-600 font-medium">Offer #{createdOfferFromBuilder.offer_letter_number} created.</span>
                  <button
                    type="button"
                    onClick={handleGeneratePDFFromBuilder}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FiFileText className="w-4 h-4" />
                    Generate PDF
                  </button>
                  {createdOfferFromBuilder.pdf_path && (
                    <button
                      type="button"
                      onClick={handleDownloadFromBuilder}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      Download PDF
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedOfferFromBuilder(null);
                      setFormData({
                        position: '', department: '', reporting_manager: '', location: '', employment_type: '', working_hours: '', offer_date: '',
                        candidate_name: '', candidate_address: '', candidate_id: '',
                        company_name: '', company_address: '', company_website: '',
                        offered_ctc: '', annual_ctc: '', monthly_ctc: '', basic_salary: '', hra: '', conveyance: '', special_allowance: '', lta: '', other_allowances: '', variable_pay: '', pf: '', esi: '', professional_tax: '', employee_pf: '',
                        joining_date: '', probation_period_months: 3,
                        notice_period_days: 30, acceptance_deadline: '', terms_and_conditions: '',
                        hr_email: '', authorized_person: '', designation: '',
                        template_id: '', corner_design: 1,
                        corner_position: 'top_right', font_family: 'Helvetica', font_size_body: 11, line_spacing: 1.0
                      });
                      setPlaceholders({ company_name: '', company_address: '', logo_url: '' });
                      setShowForm(false);
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {offers.map((offer) => (
                <tr key={offer.offer_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {offer.offer_letter_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {offer.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {offer.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{parseFloat(offer.offered_ctc).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(offer.status)}`}>
                      {offer.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setViewingOffer(offer);
                          setShowViewOfferModal(true);
                        }} 
                        className="text-indigo-600 hover:text-indigo-800" 
                        title="View Offer Letter"
                      >
                        <FiEye className="w-5 h-5" />
                      </button>
                      {!offer.pdf_path && (
                        <button onClick={() => handleGeneratePDF(offer.offer_id)} className="text-blue-600 hover:text-blue-800" title="Generate PDF">
                          <FiFileText className="w-5 h-5" />
                        </button>
                      )}
                      {offer.pdf_path && (
                        <button onClick={() => handleDownloadPDF(offer.offer_id)} className="text-green-600 hover:text-green-800" title="Download PDF">
                          <FiDownload className="w-5 h-5" />
                        </button>
                      )}
                      {offer.status === 'draft' && (
                        <button onClick={() => handleSend(offer.offer_id)} className="text-teal-600 hover:text-teal-800" title="Send Offer">
                          <FiSend className="w-5 h-5" />
                        </button>
                      )}
                      {offer.status === 'accepted' && !offer.linked_to_payroll && (
                        <button onClick={() => handleLinkPayroll(offer.offer_id)} className="text-purple-600 hover:text-purple-800" title="Link to Payroll">
                          <FiLink className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(offer.offer_id, offer.offer_letter_number)} 
                        className="text-red-600 hover:text-red-800" 
                        title="Delete Offer Letter"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {offers.length === 0 && (
            <div className="text-center py-12">
              <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No offer letters found</p>
            </div>
          )}
        </div>
      )}

      {/* View Offer Letter Modal */}
      {showViewOfferModal && viewingOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Offer Letter Details</h2>
                <p className="text-sm text-gray-600 mt-1">#{viewingOffer.offer_letter_number}</p>
              </div>
              <button
                onClick={() => {
                  setShowViewOfferModal(false);
                  setViewingOffer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(viewingOffer.status)}`}>
                  {viewingOffer.status.toUpperCase()}
                </span>
                {viewingOffer.template_id && (
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    Template Linked
                  </span>
                )}
                {viewingOffer.linked_to_payroll && (
                  <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Linked to Payroll
                  </span>
                )}
              </div>

              {/* Offer Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Position</h3>
                  <p className="text-gray-900">{viewingOffer.position}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Department</h3>
                  <p className="text-gray-900">{viewingOffer.department}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Reporting Manager</h3>
                  <p className="text-gray-900">{viewingOffer.reporting_manager || 'Not assigned'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Location</h3>
                  <p className="text-gray-900">{viewingOffer.location || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Joining Date</h3>
                  <p className="text-gray-900">
                    {viewingOffer.joining_date ? new Date(viewingOffer.joining_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Probation Period</h3>
                  <p className="text-gray-900">{viewingOffer.probation_period_months || 3} months</p>
                </div>
              </div>

              {/* Compensation Details */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compensation Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Annual CTC</p>
                    <p className="text-lg font-semibold text-gray-900">₹{parseFloat(viewingOffer.offered_ctc).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Basic Salary</p>
                    <p className="text-lg font-semibold text-gray-900">₹{parseFloat(viewingOffer.basic_salary).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">HRA</p>
                    <p className="text-lg font-semibold text-gray-900">₹{parseFloat(viewingOffer.hra || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Special Allowance</p>
                    <p className="text-lg font-semibold text-gray-900">₹{parseFloat(viewingOffer.special_allowance || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Other Allowances</p>
                    <p className="text-lg font-semibold text-gray-900">₹{parseFloat(viewingOffer.other_allowances || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Variable Pay</p>
                    <p className="text-lg font-semibold text-gray-900">₹{parseFloat(viewingOffer.variable_pay || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              {viewingOffer.terms_and_conditions && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms and Conditions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingOffer.terms_and_conditions}</p>
                </div>
              )}

              {/* Additional Info */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Notice Period</p>
                    <p className="text-gray-900">{viewingOffer.notice_period_days || 30} days</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created At</p>
                    <p className="text-gray-900">{new Date(viewingOffer.created_at).toLocaleString()}</p>
                  </div>
                  {viewingOffer.sent_at && (
                    <div>
                      <p className="text-gray-600">Sent At</p>
                      <p className="text-gray-900">{new Date(viewingOffer.sent_at).toLocaleString()}</p>
                    </div>
                  )}
                  {viewingOffer.accepted_at && (
                    <div>
                      <p className="text-gray-600">Accepted At</p>
                      <p className="text-gray-900">{new Date(viewingOffer.accepted_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-end mt-6 border-t pt-4">
              {viewingOffer.pdf_path && (
                <button
                  onClick={() => handleDownloadPDF(viewingOffer.offer_id)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FiDownload className="w-4 h-4" />
                  Download PDF
                </button>
              )}
              {!viewingOffer.pdf_path && (
                <button
                  onClick={() => {
                    handleGeneratePDF(viewingOffer.offer_id);
                    setShowViewOfferModal(false);
                    setViewingOffer(null);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FiFileText className="w-4 h-4" />
                  Generate PDF
                </button>
              )}
              <button
                onClick={() => {
                  setShowViewOfferModal(false);
                  setViewingOffer(null);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Offer Letter Modal - PDF with corner/header design visible */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Offer Letter Preview</h2>
              <button
                onClick={closePreviewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 min-h-0 border rounded-lg bg-gray-100 overflow-hidden">
              {previewPdfUrl ? (
                <iframe
                  title="Offer letter PDF preview"
                  src={previewPdfUrl}
                  className="w-full h-full min-h-[70vh]"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  {previewText || '(No content)'}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={closePreviewModal}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    name="template_name"
                    value={templateForm.template_name}
                    onChange={handleTemplateInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={templateForm.company_name}
                    onChange={handleTemplateInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={templateForm.description}
                    onChange={handleTemplateInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                  <textarea
                    name="company_address"
                    value={templateForm.company_address}
                    onChange={handleTemplateInputChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="2"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="text"
                    name="logo_url"
                    value={templateForm.logo_url}
                    onChange={handleTemplateInputChange}
                    placeholder="/uploads/logos/... or full URL"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Content *</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Use [LOGO] or [Company Logo] for logo; [Company_Name], [Company_Address], [Company_Website]; {'{{candidate_name}}'}, {'{{job_title}}'}, {'{{department}}'}, {'{{joining_date}}'}, {'{{manager_name}}'}, {'{{office_location}}'}, {'{{employment_type}}'}, {'{{working_hours}}'}; {'{{basic_salary}}'}, {'{{hra}}'}, {'{{conveyance}}'}, {'{{lta}}'}, {'{{pf}}'}, {'{{esi}}'}, {'{{monthly_ctc}}'}, {'{{annual_ctc}}'}; {'{{probation_period}}'}, {'{{notice_period}}'}, {'{{acceptance_deadline}}'}; {'{{hr_email}}'}, {'{{authorized_person}}'}, {'{{designation}}'}. Use tab-separated lines for compensation tables (e.g. Component\tAmount).
                  </p>
                  <textarea
                    name="template_content"
                    value={templateForm.template_content}
                    onChange={handleTemplateInputChange}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    rows="20"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={templateForm.is_default}
                      onChange={handleTemplateInputChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Set as default template</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
                  <FiSave className="w-4 h-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    resetTemplateForm();
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Template Modal */}
      {showViewModal && viewingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{viewingTemplate.template_name}</h2>
                {viewingTemplate.is_default && (
                  <span className="inline-block mt-2 px-3 py-1 text-xs bg-teal-100 text-teal-800 rounded">Default Template</span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Template Metadata */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Source:</span>
                  <span className="ml-2 text-gray-600">
                    {viewingTemplate.source_type === 'pdf_extracted' ? '📄 PDF Upload' : '✏️ Manual Entry'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(viewingTemplate.created_at).toLocaleString()}
                  </span>
                </div>
                {viewingTemplate.description && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="mt-1 text-gray-600">{viewingTemplate.description}</p>
                  </div>
                )}
                {viewingTemplate.company_name && (
                  <div>
                    <span className="font-medium text-gray-700">Company Name:</span>
                    <span className="ml-2 text-gray-600">{viewingTemplate.company_name}</span>
                  </div>
                )}
                {viewingTemplate.company_address && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Company Address:</span>
                    <p className="mt-1 text-gray-600 whitespace-pre-line">{viewingTemplate.company_address}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Content Length:</span>
                  <span className="ml-2 text-gray-600">
                    {viewingTemplate.template_content?.length || 0} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Template Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Content
              </label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 max-h-96 overflow-y-auto">
                  {viewingTemplate.template_content || '(No content)'}
                </pre>
              </div>
              {viewingTemplate.template_content && (
                <p className="mt-2 text-xs text-gray-500">
                  💡 Tip: This content will be used when generating PDFs. Placeholders like [Company_Name], [Employee_Name] will be replaced with actual values.
                </p>
              )}
            </div>

            {/* Extraction Quality Indicator for PDF templates */}
            {viewingTemplate.source_type === 'pdf_extracted' && (
              <div className="mb-4 space-y-3">
                <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">📄 PDF Extraction Status</h4>
                  <div className="text-sm text-blue-800">
                    {viewingTemplate.template_content && viewingTemplate.template_content.length > 100 ? (
                      <div>
                        <p className="mb-1">✅ <strong>Extraction Successful</strong></p>
                        <p className="text-xs">
                          {viewingTemplate.template_content.length > 500 
                            ? 'Good quality extraction with substantial content.'
                            : 'Extraction completed. Review content to ensure accuracy.'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-1">⚠️ <strong>Low Content Extracted</strong></p>
                        <p className="text-xs">
                          Only {viewingTemplate.template_content?.length || 0} characters extracted. 
                          The PDF might be image-based or require OCR. Consider editing manually.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Important Note about Images */}
                <div className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50">
                  <h4 className="font-medium text-amber-900 mb-2">ℹ️ Important Note</h4>
                  <div className="text-sm text-amber-800">
                    <p className="mb-2">
                      <strong>Images cannot be extracted:</strong> Logos, signatures, stamps, and other images in the PDF are not included in the extracted text.
                    </p>
                    <p className="text-xs">
                      These elements will need to be added manually when generating offer letters, or you can edit the template to include placeholders like [LOGO] or [SIGNATURE] that can be replaced during PDF generation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  handleEditTemplate(viewingTemplate);
                  setShowViewModal(false);
                  setViewingTemplate(null);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FiEdit className="w-4 h-4" />
                Edit Template
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingTemplate(null);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload PDF Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Upload PDF Template</h2>
            <form onSubmit={handleUploadPdf} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  name="template_name"
                  value={templateForm.template_name}
                  onChange={handleTemplateInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  name="description"
                  value={templateForm.description}
                  onChange={handleTemplateInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={templateForm.company_name}
                  onChange={handleTemplateInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                <textarea
                  name="company_address"
                  value={templateForm.company_address}
                  onChange={handleTemplateInputChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a PDF offer letter. The system will extract the text and create a template.
                </p>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2">
                  <FiUpload className="w-4 h-4" />
                  Upload & Extract
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    resetTemplateForm();
                  }}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Detect Modal */}
      {showAutoDetectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">🤖 Auto-Detect Workflow</h2>
              <button
                onClick={() => {
                  // Clean up blob URLs to prevent memory leaks
                  if (originalPdfUrl) {
                    window.URL.revokeObjectURL(originalPdfUrl);
                  }
                  if (autoDetectPreviewUrl) {
                    window.URL.revokeObjectURL(autoDetectPreviewUrl);
                  }
                  
                  setShowAutoDetectModal(false);
                  setAutoDetectStep(1);
                  setDetectionResult(null);
                  setAutoDetectValues({});
                  setAutoDetectPreview('');
                  setAutoDetectPreviewUrl('');
                  setOriginalPdfUrl('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  autoDetectStep >= 1 ? 'bg-[#181c52] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <div className={`w-24 h-1 ${
                  autoDetectStep >= 2 ? 'bg-[#181c52] text-white' : 'bg-gray-200'
                }`}></div>
              </div>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  autoDetectStep >= 2 ? 'bg-[#181c52] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <div className={`w-24 h-1 ${
                  autoDetectStep >= 3 ? 'bg-[#181c52] text-white' : 'bg-gray-200'
                }`}></div>
              </div>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  autoDetectStep >= 3 ? 'bg-[#181c52] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <div className={`w-24 h-1 ${
                  autoDetectStep >= 4 ? 'bg-[#181c52] text-white' : 'bg-gray-200'
                }`}></div>
              </div>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  autoDetectStep >= 4 ? 'bg-[#181c52] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  4
                </div>
              </div>
            </div>

            {/* Step 1: Detect Placeholders */}
            {autoDetectStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🔍 Step 1: Detect Placeholders from PDF</h3>
                <p className="text-gray-600">Template: <strong>{autoDetectTemplate?.template_name}</strong></p>
                <p className="text-gray-600 text-sm">System will scan the template for placeholders like {'{{' + '}}'}field_name{'{{' + '}}'} and [field_name]</p>
                <button
                  onClick={async () => {
                    try {
                      console.log('Detecting placeholders for template:', autoDetectTemplate.template_id);
                      
                      // First, fetch the original PDF
                      try {
                        const pdfResponse = await offerLetterAPI.downloadTemplatePdf(autoDetectTemplate.template_id);
                        const pdfBlob = new Blob([pdfResponse], { type: 'application/pdf' });
                        const pdfUrl = window.URL.createObjectURL(pdfBlob);
                        setOriginalPdfUrl(pdfUrl);
                        console.log('PDF loaded successfully');
                      } catch (pdfError) {
                        console.warn('Could not load PDF preview:', pdfError);
                        toast.warning('⚠️ PDF preview not available');
                      }
                      
                      // Then detect placeholders
                      const response = await offerLetterAPI.detectAndSuggestPlaceholders(autoDetectTemplate.template_id);
                      console.log('Detection result:', response);
                      // ✅ Normalize response shape here
const normalizedResult = {
  template_id: autoDetectTemplate.template_id, 
  template_name: response.template_name ?? autoDetectTemplate.template_name,
  detected_count:
    response.detected_count ??
    response.count ??
    response.placeholders?.length ??
    (Array.isArray(response) ? response.length : 0),

  placeholders: (
    response.placeholders ??
    response.data?.placeholders ??
    (Array.isArray(response) ? response : [])
  ).map((ph, index) => ({
    placeholder_name:
      ph.placeholder_name ||
      ph.name ||
      ph.placeholder ||
      ph.key ||
      ph.field ||
      `placeholder_${index + 1}`,
    data_type: ph.data_type || ph.type || "string",
  })),
};


console.log("Normalized detect result:", normalizedResult);

// ✅ Store normalized data
setDetectionResult(normalizedResult);
setAutoDetectValues({});
setAutoDetectStep(2);

// ✅ Use normalized count (never undefined)
toast.success(`✅ Detected ${normalizedResult.detected_count} placeholders!`);

                    } catch (error) {
                      console.error('Error detecting placeholders:', error);
                      const errorMsg = error.response?.status === 404 
                        ? `Template not found (ID: ${autoDetectTemplate.template_id}). It may have been deleted or doesn't exist.`
                        : error.response?.data?.detail || error.message;
                      toast.error('❌ ' + errorMsg);
                    }
                  }}
                  className="bg-[#ffbd59]text-white px-6 py-2 rounded-lg hover:bg-[#ffbd59] flex items-center gap-2"
                >
                  🔍 Detect Placeholders from PDF
                </button>
              </div>
            )}

            {/* Step 2: View PDF and Detected Placeholders */}
            {autoDetectStep === 2 && detectionResult && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📄 Step 2:  Detected Placeholders</h3>
                <p className="text-gray-600 mb-4">
                  {detectionResult.detected_count} placeholders detected in: <strong>{detectionResult.template_name}</strong>
                </p>
                
                {/* Display Original PDF */}
                {/* <div className="mb-6">
                  <h4 className="font-semibold mb-2">📄 Original PDF Template</h4>
                  {originalPdfUrl ? (
                    <iframe
                      src={originalPdfUrl}
                      className="w-full h-96 border border-gray-200 rounded-lg"
                      title="Original PDF"
                    />
                  ) : (
                    <div className="w-full h-96 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                      <p className="text-gray-500">PDF preview not available</p>
                    </div>
                  )}
                </div> */}

                {/* Display Detected Placeholders */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">🔍 Detected Placeholders ({detectionResult.detected_count})</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {detectionResult.placeholders?.map((ph, index) => (
                        <div key={index} className="bg-white px-3 py-2 rounded border border-gray-300 text-sm">
                          <span className="font-mono text-teal-600">{ph.placeholder_name || ph.name || ph.placeholder || ph.key || ph.field}
</span>
                          {ph.data_type && <span className="text-xs text-gray-500 ml-2">({ph.data_type})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setAutoDetectStep(1)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
  const initialValues = {};
  
  detectionResult.placeholders.forEach((ph) => {
    initialValues[ph.placeholder_name] = "";
  });

  setAutoDetectValues(initialValues);
  setAutoDetectStep(3);
}}

                    className="bg-[#ffbd59] text-white px-6 py-2 rounded-lg hover:bg-[#ffbd59]"
                  >
                    Next: Edit Placeholders →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Edit Placeholders and View Changes */}
            {autoDetectStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">✏️ Step 3: Edit Placeholders and View Changes</h3>
                <p className="text-gray-600 mb-4">Fill in the placeholder values and preview the changes in real-time</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left side: Edit Form */}
                  <div>
                    <h4 className="font-semibold mb-3">📝 Edit Values</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {detectionResult.placeholders?.map((ph) => (
                        <div key={ph.placeholder_name}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {ph.placeholder_name}
                            {ph.data_type && <span className="text-xs text-gray-500"> ({ph.data_type})</span>}
                          </label>
                          <input
  type={ph.data_type === 'number' ? 'number' : 'text'}
  value={autoDetectValues[ph.placeholder_name] || ''}
  onChange={(e) =>
    setAutoDetectValues({
      ...autoDetectValues,
      [ph.placeholder_name]: e.target.value,
    })
  }
  placeholder={`Enter ${ph.placeholder_name}`}
  className="
    w-full px-3 py-2 border-2 border-gray-500
    rounded-lg text-sm
    
  "
/>

                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right side: Live Preview */}
                  <div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
  {generatingPreview && (
    <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-3 text-sm text-gray-600">
          Generating preview…
        </p>
      </div>
    </div>
  )}

  {autoDetectPreviewUrl ? (
    <iframe
      src={autoDetectPreviewUrl}
      className="w-full h-96 border-0 rounded"
      title="Live PDF Preview"
    />
  ) : (
    <div className="h-96 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <p className="mb-2">No preview yet</p>
        <p className="text-sm">Click "Generate Preview" to see changes</p>
      </div>
    </div>
  )}
</div>

                    
    <button
  onClick={handleGeneratePreviewWithDelay}
  disabled={generatingPreview}
  className="mt-3 w-full flex items-center justify-center gap-2
             bg-[#ffbd59] text-white px-4 py-2 rounded-lg
             hover:bg-[#ffbd59] disabled:opacity-60 disabled:cursor-not-allowed"
>
  {generatingPreview ? (
    <>
      <span>Generating…</span>
    </>
  ) : (
    <>
      <FiEye className="w-4 h-4" />
      Generate Preview
    </>
  )}
</button>



                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button
                    onClick={() => setAutoDetectStep(2)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setAutoDetectStep(4)}
                    disabled={!autoDetectPreviewUrl}
                    className="bg-[#ffbd59] text-white px-6 py-2 rounded-lg hover:bg-[#ffbd59] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Final Preview & Download →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Preview and Download Final PDF */}
            {autoDetectStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">✅ Step 4: Preview and Download Final PDF</h3>
                <p className="text-gray-600 mb-4">Your offer letter is ready! Review the final document and download.</p>
                
                {autoDetectPreviewUrl && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">📄 Final PDF Preview</h4>
                    <div
                      ref={previewContainerRef}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files && e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                          // position at drop point
                          const rect = previewContainerRef.current.getBoundingClientRect();
                          const dropX = e.clientX - rect.left;
                          const dropY = e.clientY - rect.top;
                          // set preview and position
                          if (autoDetectImagePreview) window.URL.revokeObjectURL(autoDetectImagePreview);
                          const previewUrl = window.URL.createObjectURL(file);
                          setAutoDetectImageFile(file);
                          setAutoDetectImagePreview(previewUrl);
                          // convert to percentage to preserve across sizes
                          setSignaturePos({ x: Math.max(0, dropX - 40), y: Math.max(0, dropY - 20) });
                        }
                      }}
                      className="relative w-full h-[600px] border-2 border-gray-300 rounded-lg overflow-hidden bg-white"
                    >
                      <iframe
                        src={autoDetectPreviewUrl}
                        className="w-full h-full border-0"
                        title="Final PDF Preview"
                      />

                      {/* Draggable signature overlay */}
                      {autoDetectImagePreview && (
                        <Draggable
                          bounds="parent"
                          position={{ x: signaturePos.x, y: signaturePos.y }}
                          onDrag={(e, data) => {
                            setSignaturePos({ x: data.x, y: data.y });
                          }}
                          onStop={(e, data) => {
                            setSignaturePos({ x: data.x, y: data.y });
                            // persist position
                            try {
                              const stored = JSON.parse(localStorage.getItem(SIGNATURE_STORAGE_KEY) || '{}');
                              stored.pos = { x: data.x, y: data.y };
                              localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(stored));
                            } catch (err) { console.warn('Could not persist signature pos', err); }
                          }}
                        >
                          <div style={{ position: 'absolute', left: 0, top: 0, width: signatureSize.width, height: signatureSize.height, zIndex: 10 }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              <img
                                src={autoDetectImagePreview}
                                alt="signature"
                                style={{ width: '100%', height: '100%', objectFit: 'contain', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                                className="cursor-move"
                              />

                              {/* Resizer handles (8 handles) */}
                              <div onMouseDown={(e) => startResize('nw', e)} style={{ position: 'absolute', left: -6, top: -6, width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'nwse-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('n', e)} style={{ position: 'absolute', left: '50%', top: -6, transform: 'translateX(-50%)', width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'ns-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('ne', e)} style={{ position: 'absolute', right: -6, top: -6, width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'nesw-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('e', e)} style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'ew-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('se', e)} style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'nwse-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('s', e)} style={{ position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%)', width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'ns-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('sw', e)} style={{ position: 'absolute', left: -6, bottom: -6, width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'nesw-resize', zIndex: 20 }} />
                              <div onMouseDown={(e) => startResize('w', e)} style={{ position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 2, cursor: 'ew-resize', zIndex: 20 }} />
                            </div>
                          </div>
                        </Draggable>
                      )}

                      {/* Transparent overlay to capture drops over iframe (iframes block drop events) */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files && e.dataTransfer.files[0];
                          if (file && file.type.startsWith('image/')) {
                            const rect = previewContainerRef.current.getBoundingClientRect();
                            const dropX = e.clientX - rect.left;
                            const dropY = e.clientY - rect.top;
                            // read as data URL and persist
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result;
                              setAutoDetectImageFile(null);
                              setAutoDetectImagePreview(dataUrl);
                              setSignaturePos({ x: Math.max(0, dropX - signatureSize.width / 2), y: Math.max(0, dropY - signatureSize.height / 2) });
                              try { localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify({ data_url: dataUrl, pos: { x: Math.max(0, dropX - signatureSize.width / 2), y: Math.max(0, dropY - signatureSize.height / 2) }, size: signatureSize })); } catch (err) {}
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0"
                        style={{ zIndex: 5 }}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Summary</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Template: <strong>{detectionResult?.template_name || autoDetectTemplate?.template_name || 'Unknown'}</strong></p>
                    <p>• Placeholders filled: <strong>{Object.keys(autoDetectValues).length}</strong></p>
                    <p>• Document ready for download</p>
                  </div>
                </div>

                {/* Image Upload Section */}
<div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
  <h4 className="font-semibold mb-3">🖼 Add Image </h4>
  <p className="text-sm text-gray-600 mb-3">
    Upload one image (e.g. signature, seal, logo). Only one image allowed.
  </p>

  <div
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        // reuse upload handler behavior
        handleAutoDetectImageUpload(file);
      }
    }}
    className="p-2 rounded"
  >
    {!autoDetectImagePreview ? (
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleAutoDetectImageUpload}
          className="block w-full text-sm mb-2"
        />
        <div className="text-xs text-gray-500">Or drag & drop an image directly onto the PDF preview to place signature</div>
      </div>
    ) : (
      <div className="flex items-start gap-4">
        <img
          src={autoDetectImagePreview}
          alt="Uploaded preview"
          className="h-32 border rounded shadow"
        />

        <div className="flex flex-col gap-2">
          <button
            onClick={handleAutoDetectImageDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete Image
          </button>
          <div className="flex items-center gap-2">
            {/* <label className="text-sm">Width:</label> */}
            {/* <input
              type="number"
              value={signatureSize.width}
              onChange={(e) => setSignatureSize(s => ({ ...s, width: Math.max(20, Number(e.target.value) || 20) }))}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
            <label className="text-sm">Height:</label>
            <input
              type="number"
              value={signatureSize.height}
              onChange={(e) => setSignatureSize(s => ({ ...s, height: Math.max(10, Number(e.target.value) || 10) }))}
              className="w-20 px-2 py-1 border rounded text-sm"
            /> */}
          </div>
        </div>
      </div>
    )}
  </div>
</div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setAutoDetectStep(3)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                  >
                    ← Back to Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('[Download] === START ===');
                        console.log('[Download] autoDetectValues:', autoDetectValues);
                        console.log('[Download] autoDetectValues type:', typeof autoDetectValues);
                        console.log('[Download] autoDetectValues keys:', Object.keys(autoDetectValues || {}));
                        console.log('[Download] autoDetectValues JSON:', JSON.stringify(autoDetectValues, null, 2));
                        
                        // Get template info with fallback
                        const templateId = detectionResult?.template_id || autoDetectTemplate?.template_id;
                        const templateName = detectionResult?.template_name || autoDetectTemplate?.template_name || 'offer-letter';
                        
                        console.log('[Download] Template ID:', templateId);
                        console.log('[Download] Template Name:', templateName);
                        
                        if (!templateId) {
                          toast.error('❌ Template ID missing. Please restart detection.');
                          return;
                        }
                        
                        // Check if values are filled
                        if (!autoDetectValues || Object.keys(autoDetectValues).length === 0) {
                          console.error('[Download] Values are empty!');
                          toast.error('❌ Please fill in placeholder values in Step 3 before downloading.');
                          return;
                        }
                        
                        const payload = {
                          template_id: templateId,
                          values: autoDetectValues,  // Backend expects 'values' not 'placeholders'
                        };

                        // If user uploaded a signature image (preview), include it (base64) and position info
                        if (autoDetectImagePreview && previewContainerRef.current) {
                          try {
                            // Ensure we have a data URL. If preview is a blob: URL, convert to data URL
                            let dataUrl = autoDetectImagePreview;
                            if (autoDetectImagePreview.startsWith('blob:')) {
                              const resp = await fetch(autoDetectImagePreview);
                              const blob = await resp.blob();
                              const toDataURL = (file) => new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = (err) => reject(err);
                                reader.readAsDataURL(file);
                              });
                              dataUrl = await toDataURL(blob);
                            }

                            const rect = previewContainerRef.current.getBoundingClientRect();
                            const xPct = rect.width > 0 ? (signaturePos.x / rect.width) : 0;
                            const yPct = rect.height > 0 ? (signaturePos.y / rect.height) : 0;
                            const wPct = rect.width > 0 ? (signatureSize.width / rect.width) : 0;
                            const hPct = rect.height > 0 ? (signatureSize.height / rect.height) : 0;

                            payload.signature = {
                              data_url: dataUrl,
                              x_pct: xPct,
                              y_pct: yPct,
                              w_pct: wPct,
                              h_pct: hPct,
                              filename: 'signature.png',
                            };
                            console.log('[Download] Attached signature info to payload:', payload.signature);
                          } catch (err) {
                            console.warn('Could not attach signature to payload:', err);
                          }
                        }
                        
                        console.log('[Download] Payload to send:', payload);
                        console.log('[Download] Payload JSON:', JSON.stringify(payload, null, 2));
                        
                        toast.info('📥 Downloading document...');
                        const blobData = await offerLetterAPI.downloadWithValues(payload);
                        
                        console.log('[Download] Blob received, size:', blobData?.size);
                        
                        if (!blobData || blobData.size === 0) {
                          throw new Error('Received empty file');
                        }
                        
                        // Detect file type from blob
                        const isDocx = blobData.type.includes('wordprocessingml') || 
                                      blobData.type.includes('msword') ||
                                      blobData.type.includes('officedocument');
                        
                        const fileExt = isDocx ? 'docx' : 'pdf';
                        const mimeType = isDocx 
                          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                          : 'application/pdf';
                        
                        // Create properly typed blob
                        const blob = new Blob([blobData], { type: mimeType });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `offer-letter-${templateName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().getTime()}.${fileExt}`;
                        document.body.appendChild(link);
                        link.click();
                        
                        setTimeout(() => {
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        }, 100);
                        
                        toast.success('✅ Document downloaded successfully!');
                        setShowAutoDetectModal(false);
                      } catch (error) {
                        console.error('[Download Error]:', error);
                        toast.error('❌ Download failed: ' + (error.response?.data?.detail || error.message));
                      }
                    }}
                    className="bg-[#ffbd59] text-white px-6 py-2 rounded-lg hover:bg-[#ffbd59] flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    ⬇️ Download Final PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Helper functions for Auto-Detect
async function handleAutoDetectUpload() {
  if (!autoDetectFile) {
    alert('Please select a file');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', autoDetectFile);
    formData.append('name', autoDetectTemplateName);

    const response = await offerLetterAPI.uploadTemplate(formData);
    setAutoDetectTemplate(response.data);
    setAutoDetectStep(2);
    toast.success('✅ Template uploaded successfully!');
  } catch (error) {
    toast.error('❌ Error uploading template: ' + (error.response?.data?.detail || error.message));
  }
}

async function handleDetectPlaceholders() {
  if (!autoDetectTemplate?.template_id) {
    toast.error('No template found. Please upload first.');
    return;
  }

  try {
    const response = await offerLetterAPI.detectAndSuggestPlaceholders(autoDetectTemplate.template_id);
    setDetectionResult(response);
    setAutoDetectValues({});
    setAutoDetectStep(3);
    toast.success(`✅ Detected ${response.detected_count} placeholders!`);
  } catch (error) {
    toast.error('❌ Error detecting placeholders: ' + (error.response?.data?.detail || error.message));
  }
}

async function handleAutoDetectPreview() {
  if (!detectionResult?.template_id) {
    toast.error('No detection result found. Please detect first.');
    return;
  }

  try {
    const payload = {
      template_id: detectionResult.template_id,
      values: autoDetectValues
    };

    const response = await offerLetterAPI.previewWithValues(payload);
    setAutoDetectPreview(response.data.html_preview);
    setAutoDetectStep(4);
    toast.success('✅ HTML Preview generated!');
  } catch (error) {
    toast.error('❌ Error generating preview: ' + (error.response?.data?.detail || error.message));
  }
}

async function handleAutoDetectPreviewPdf() {
  if (!detectionResult?.template_id) {
    toast.error('No detection result found. Please detect first.');
    return;
  }

  try {
    const payload = {
      template_id: detectionResult.template_id,
      values: autoDetectValues
    };

    const blob = await offerLetterAPI.previewWithValues(payload);
    const url = window.URL.createObjectURL(blob);
    setAutoDetectPreviewUrl(url);
    setAutoDetectStep(4);
    toast.success('✅ PDF Preview generated!');
  } catch (error) {
    toast.error('❌ Error generating PDF: ' + (error.response?.data?.detail || error.message));
  }
}

async function handleAutoDetectDownload() {
  if (!detectionResult?.template_id) {
    toast.error('No document to download.');
    return;
  }

  try {
    const payload = {
      template_id: detectionResult.template_id,
      values: autoDetectValues
    };

    const response = await offerLetterAPI.downloadWithValues(payload);
    
    // Create a blob and download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = response.data.filename || `offer-letter-${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('✅ Document downloaded successfully!');
  } catch (error) {
    toast.error('❌ Error downloading document: ' + (error.response?.data?.detail || error.message));
  }
}

