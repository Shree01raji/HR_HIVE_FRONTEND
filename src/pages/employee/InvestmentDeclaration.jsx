import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiFileText, FiCheckCircle, FiX, FiEdit3, FiSave, FiUpload } from 'react-icons/fi';
import { investmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function InvestmentDeclaration() {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    financial_year: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
    // Section 80C
    life_insurance_premium: 0,
    elss_mutual_funds: 0,
    ppf: 0,
    epf: 0,
    nsc: 0,
    tax_saving_fd: 0,
    principal_repayment_home_loan: 0,
    sukanya_samriddhi: 0,
    other_80c: 0,
    // Section 80D
    health_insurance_self_family: 0,
    health_insurance_parents: 0,
    // Other sections
    donations_80g: 0,
    home_loan_interest: 0,
    education_loan_interest: 0,
    savings_interest: 0,
    hra_exemption: 0,
    rent_paid: 0,
    rent_receipts_uploaded: false,
    other_deductions: 0,
    other_deductions_description: ''
  });

  useEffect(() => {
    fetchDeclarations();
  }, []);

  const fetchDeclarations = async () => {
    try {
      setLoading(true);
      const data = await investmentAPI.getMyDeclarations();
      setDeclarations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching declarations:', err);
      setError('Failed to load investment declarations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rent_receipts_uploaded' ? e.target.checked : parseFloat(value) || 0
    }));
  };

  const calculateSection80C = () => {
    const total = 
      (formData.life_insurance_premium || 0) +
      (formData.elss_mutual_funds || 0) +
      (formData.ppf || 0) +
      (formData.epf || 0) +
      (formData.nsc || 0) +
      (formData.tax_saving_fd || 0) +
      (formData.principal_repayment_home_loan || 0) +
      (formData.sukanya_samriddhi || 0) +
      (formData.other_80c || 0);
    return Math.min(total, 150000); // Cap at 1.5L
  };

  const calculateSection80D = () => {
    return (formData.health_insurance_self_family || 0) + (formData.health_insurance_parents || 0);
  };

  const calculateTotal = () => {
    return calculateSection80C() + calculateSection80D() + 
      (formData.donations_80g || 0) + (formData.home_loan_interest || 0) +
      (formData.education_loan_interest || 0) + (formData.savings_interest || 0) +
      (formData.hra_exemption || 0) + (formData.other_deductions || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await investmentAPI.updateDeclaration(editingId, formData);
      } else {
        await investmentAPI.createDeclaration(formData);
      }
      await fetchDeclarations();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        financial_year: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
        life_insurance_premium: 0,
        elss_mutual_funds: 0,
        ppf: 0,
        epf: 0,
        nsc: 0,
        tax_saving_fd: 0,
        principal_repayment_home_loan: 0,
        sukanya_samriddhi: 0,
        other_80c: 0,
        health_insurance_self_family: 0,
        health_insurance_parents: 0,
        donations_80g: 0,
        home_loan_interest: 0,
        education_loan_interest: 0,
        savings_interest: 0,
        hra_exemption: 0,
        rent_paid: 0,
        rent_receipts_uploaded: false,
        other_deductions: 0,
        other_deductions_description: ''
      });
    } catch (err) {
      console.error('Error saving declaration:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save declaration';
      
      // Check if it's a duplicate declaration error
      if (errorMessage.includes('already exists') && errorMessage.includes('financial year')) {
        // Try to find and load the existing declaration
        try {
          const updatedDeclarations = await investmentAPI.getMyDeclarations();
          const declarationsList = Array.isArray(updatedDeclarations) ? updatedDeclarations : [];
          const existingDeclaration = declarationsList.find(
            d => d.financial_year === formData.financial_year
          );
          
          if (existingDeclaration) {
            if (existingDeclaration.declaration_status === 'draft') {
              // Offer to edit the existing draft
              const shouldEdit = window.confirm(
                `A declaration for financial year ${formData.financial_year} already exists.\n\n` +
                `Would you like to edit the existing declaration?`
              );
              if (shouldEdit) {
                // Update the declarations list first
                setDeclarations(declarationsList);
                handleEdit(existingDeclaration);
                return;
              }
            } else {
              // Declaration is already submitted/verified
              setError(
                `A declaration for financial year ${formData.financial_year} already exists ` +
                `and has been ${existingDeclaration.declaration_status}. ` +
                `You cannot create a new declaration for this financial year.`
              );
              // Refresh the declarations list
              setDeclarations(declarationsList);
              return;
            }
          }
        } catch (fetchErr) {
          console.error('Error fetching declarations:', fetchErr);
        }
        
        // Fallback error message
        setError(
          `A declaration for financial year ${formData.financial_year} already exists. ` +
          `Please edit the existing declaration instead.`
        );
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleEdit = (declaration) => {
    if (declaration.declaration_status !== 'draft') {
      setError('Cannot edit submitted/verified declarations');
      return;
    }
    setFormData({
      financial_year: declaration.financial_year,
      life_insurance_premium: declaration.life_insurance_premium || 0,
      elss_mutual_funds: declaration.elss_mutual_funds || 0,
      ppf: declaration.ppf || 0,
      epf: declaration.epf || 0,
      nsc: declaration.nsc || 0,
      tax_saving_fd: declaration.tax_saving_fd || 0,
      principal_repayment_home_loan: declaration.principal_repayment_home_loan || 0,
      sukanya_samriddhi: declaration.sukanya_samriddhi || 0,
      other_80c: declaration.other_80c || 0,
      health_insurance_self_family: declaration.health_insurance_self_family || 0,
      health_insurance_parents: declaration.health_insurance_parents || 0,
      donations_80g: declaration.donations_80g || 0,
      home_loan_interest: declaration.home_loan_interest || 0,
      education_loan_interest: declaration.education_loan_interest || 0,
      savings_interest: declaration.savings_interest || 0,
      hra_exemption: declaration.hra_exemption || 0,
      rent_paid: declaration.rent_paid || 0,
      rent_receipts_uploaded: declaration.rent_receipts_uploaded || false,
      other_deductions: declaration.other_deductions || 0,
      other_deductions_description: declaration.other_deductions_description || ''
    });
    setEditingId(declaration.declaration_id);
    setShowForm(true);
  };

  const handleSubmitDeclaration = async (declarationId) => {
    if (!window.confirm('Are you sure you want to submit this declaration? You won\'t be able to edit it after submission.')) {
      return;
    }
    try {
      await investmentAPI.submitDeclaration(declarationId);
      await fetchDeclarations();
    } catch (err) {
      console.error('Error submitting declaration:', err);
      setError(err.response?.data?.detail || 'Failed to submit declaration');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Investment Declaration</h1>
        {!showForm && (
          <button
            onClick={async () => {
              const currentFinancialYear = `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
              
              // Check if declaration for current FY already exists
              const existingDeclaration = declarations.find(
                d => d.financial_year === currentFinancialYear
              );
              
              if (existingDeclaration) {
                if (existingDeclaration.declaration_status === 'draft') {
                  const shouldEdit = window.confirm(
                    `A draft declaration for financial year ${currentFinancialYear} already exists.\n\n` +
                    `Would you like to edit the existing declaration instead?`
                  );
                  if (shouldEdit) {
                    handleEdit(existingDeclaration);
                    return;
                  }
                } else {
                  alert(
                    `A declaration for financial year ${currentFinancialYear} already exists ` +
                    `and has been ${existingDeclaration.declaration_status}. ` +
                    `You cannot create a new declaration for this financial year.`
                  );
                  return;
                }
              }
              
              setShowForm(true);
              setEditingId(null);
              setFormData({
                financial_year: currentFinancialYear,
                life_insurance_premium: 0,
                elss_mutual_funds: 0,
                ppf: 0,
                epf: 0,
                nsc: 0,
                tax_saving_fd: 0,
                principal_repayment_home_loan: 0,
                sukanya_samriddhi: 0,
                other_80c: 0,
                health_insurance_self_family: 0,
                health_insurance_parents: 0,
                donations_80g: 0,
                home_loan_interest: 0,
                education_loan_interest: 0,
                savings_interest: 0,
                hra_exemption: 0,
                rent_paid: 0,
                rent_receipts_uploaded: false,
                other_deductions: 0,
                other_deductions_description: ''
              });
            }}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <FiFileText className="w-5 h-5" />
            New Declaration
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold mb-1">Error</div>
            <div className="text-sm">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 ml-4"
            aria-label="Dismiss error"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Declaration' : 'New Investment Declaration'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Financial Year
              </label>
              <input
                type="text"
                name="financial_year"
                value={formData.financial_year}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="2024-25"
                required
              />
            </div>

            {/* Section 80C */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Section 80C (Max ₹1,50,000)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Life Insurance Premium</label>
                  <input type="number" name="life_insurance_premium" value={formData.life_insurance_premium} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ELSS Mutual Funds</label>
                  <input type="number" name="elss_mutual_funds" value={formData.elss_mutual_funds} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PPF</label>
                  <input type="number" name="ppf" value={formData.ppf} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EPF</label>
                  <input type="number" name="epf" value={formData.epf} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NSC</label>
                  <input type="number" name="nsc" value={formData.nsc} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Saving FD</label>
                  <input type="number" name="tax_saving_fd" value={formData.tax_saving_fd} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Loan Principal</label>
                  <input type="number" name="principal_repayment_home_loan" value={formData.principal_repayment_home_loan} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sukanya Samriddhi</label>
                  <input type="number" name="sukanya_samriddhi" value={formData.sukanya_samriddhi} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other 80C</label>
                  <input type="number" name="other_80c" value={formData.other_80c} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Section 80C Total: ₹{calculateSection80C().toLocaleString('en-IN')} / ₹1,50,000
              </div>
            </div>

            {/* Section 80D */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Section 80D (Health Insurance)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Self & Family</label>
                  <input type="number" name="health_insurance_self_family" value={formData.health_insurance_self_family} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parents</label>
                  <input type="number" name="health_insurance_parents" value={formData.health_insurance_parents} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Section 80D Total: ₹{calculateSection80D().toLocaleString('en-IN')}
              </div>
            </div>

            {/* Other Sections */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Other Deductions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section 80G (Donations)</label>
                  <input type="number" name="donations_80g" value={formData.donations_80g} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Loan Interest</label>
                  <input type="number" name="home_loan_interest" value={formData.home_loan_interest} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education Loan Interest</label>
                  <input type="number" name="education_loan_interest" value={formData.education_loan_interest} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Savings Interest</label>
                  <input type="number" name="savings_interest" value={formData.savings_interest} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HRA Exemption</label>
                  <input type="number" name="hra_exemption" value={formData.hra_exemption} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent Paid</label>
                  <input type="number" name="rent_paid" value={formData.rent_paid} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="rent_receipts_uploaded" checked={formData.rent_receipts_uploaded} onChange={handleInputChange} />
                    <span className="text-sm font-medium text-gray-700">Rent Receipts Uploaded</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Deductions</label>
                  <input type="number" name="other_deductions" value={formData.other_deductions} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                  <input type="text" name="other_deductions_description" value={formData.other_deductions_description} onChange={handleInputChange} placeholder="Description" className="w-full mt-2 px-3 py-2 border rounded-lg" />
                </div>
              </div>
            </div>

            <div className="bg-teal-50 p-4 rounded-lg">
              <div className="text-lg font-semibold text-teal-900">
                Total Deductions: ₹{calculateTotal().toLocaleString('en-IN')}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2"
              >
                <FiSave className="w-5 h-5" />
                {editingId ? 'Update' : 'Save'} Declaration
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {declarations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No investment declarations found</p>
              <p className="text-sm text-gray-500 mt-2">Create your first declaration to get started</p>
            </div>
          ) : (
            declarations.map((declaration) => (
              <div key={declaration.declaration_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Financial Year: {declaration.financial_year}</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(declaration.declaration_status)}`}>
                      {declaration.declaration_status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {declaration.declaration_status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleEdit(declaration)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FiEdit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSubmitDeclaration(declaration.declaration_id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <FiCheckCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Section 80C:</span>
                    <span className="font-semibold ml-2">₹{declaration.section_80c_total?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Section 80D:</span>
                    <span className="font-semibold ml-2">₹{declaration.section_80d_total?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Deductions:</span>
                    <span className="font-semibold ml-2 text-teal-600">₹{declaration.total_deductions?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
                {declaration.verified_at && (
                  <div className="mt-4 text-sm text-gray-600">
                    Verified on: {new Date(declaration.verified_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
