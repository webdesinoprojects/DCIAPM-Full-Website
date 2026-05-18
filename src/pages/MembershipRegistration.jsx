import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import PaymentQR from '../images/qr.png';
import {
  getMembershipPlan,
  lookupMembershipStatus,
  membershipPlans,
  membershipStatusLabels,
  submitMembershipApplication,
} from '../lib/membership';

const MembershipRegistration = () => {
  const [searchParams] = useSearchParams();
  // State to toggle between Registration and Status Check
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'status' ? 'status' : 'register'); // 'register' or 'status'

  // --- STATE: NEW REGISTRATION ---
  const [formData, setFormData] = useState({
    Name: '',
    Institution: '',
    Qualification: '', 
    Practicing: 'Yes',
    StudentStatus: '',
    Address: '',
    Email: '',
    Phone: '',
    MembershipType: 'life',
    Amount: '5,000 INR',
    TransactionDetails: '',
    Interest: 'I am an academic pathologist',
    photo: null,
    paymentProof: null,
  });
  const [regStatus, setRegStatus] = useState(null); // null, 'submitting', 'success', 'error'
  const [errors, setErrors] = useState({}); // State for Validation Errors

  // --- STATE: CHECK STATUS ---
  const [checkEmail, setCheckEmail] = useState('');
  const [statusResult, setStatusResult] = useState(null); // null, 'loading', 'found', 'not_found', 'error'
  const [memberData, setMemberData] = useState(null);

  // --- HANDLERS: REGISTRATION ---
  const handleChange = (e) => {
    const nextValue = e.target.value;
    const nextData = { ...formData, [e.target.name]: nextValue };
    if (e.target.name === 'MembershipType') {
      nextData.Amount = getMembershipPlan(nextValue).amountLabel;
    }
    setFormData(nextData);
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleFileChange = (e, field = 'photo') => {
    const file = e.target.files[0];
    if (file) {
      const isPhoto = field === 'photo';
      const maxSize = isPhoto ? 1024 * 1024 : 5 * 1024 * 1024;
      const validTypes = isPhoto
        ? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

      if (file.size > maxSize) {
        setErrors({ ...errors, [field]: isPhoto ? 'File size must be less than 1MB' : 'Payment proof must be less than 5MB' });
        e.target.value = ''; // Clear the input
        return;
      }
      
      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, [field]: isPhoto ? 'Only image files (JPG, PNG, GIF, WebP) are allowed' : 'Upload JPG, PNG, WebP or PDF payment proof' });
        e.target.value = ''; // Clear the input
        return;
      }

      setFormData((current) => ({ ...current, [field]: file }));
      if (errors[field]) setErrors({ ...errors, [field]: null });
    }
  };

  // --- VALIDATION FUNCTION ---
  const validateForm = () => {
    let tempErrors = {};
    let isValid = true;

    // Name validation - must contain only letters, spaces, and common name characters
    if (!formData.Name.trim()) {
      tempErrors.Name = "Full Name is required";
      isValid = false;
    } else if (formData.Name.trim().length < 3) {
      tempErrors.Name = "Name must be at least 3 characters";
      isValid = false;
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.Name)) {
      tempErrors.Name = "Name can only contain letters, spaces, and basic punctuation";
      isValid = false;
    }

    // Qualification validation
    if (!formData.Qualification.trim()) {
      tempErrors.Qualification = "Qualification is required";
      isValid = false;
    } else if (formData.Qualification.trim().length < 2) {
      tempErrors.Qualification = "Qualification must be at least 2 characters";
      isValid = false;
    }

    // Institution validation
    if (!formData.Institution.trim()) {
      tempErrors.Institution = "Institution is required";
      isValid = false;
    } else if (formData.Institution.trim().length < 3) {
      tempErrors.Institution = "Institution name must be at least 3 characters";
      isValid = false;
    }

    // Email validation - more strict pattern
    if (!formData.Email.trim()) {
      tempErrors.Email = "Email is required";
      isValid = false;
    } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.Email)) {
      tempErrors.Email = "Please enter a valid email address";
      isValid = false;
    }

    // Phone validation - must be exactly 10 digits
    if (!formData.Phone.trim()) {
      tempErrors.Phone = "Phone number is required";
      isValid = false;
    } else {
      const cleanPhone = formData.Phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        tempErrors.Phone = "Phone number must be exactly 10 digits";
        isValid = false;
      } else if (!/^[6-9]/.test(cleanPhone)) {
        tempErrors.Phone = "Invalid phone number (must start with 6-9)";
        isValid = false;
      }
    }

    // Address validation
    if (!formData.Address.trim()) {
      tempErrors.Address = "Address is required";
      isValid = false;
    } else if (formData.Address.trim().length < 10) {
      tempErrors.Address = "Address must be at least 10 characters";
      isValid = false;
    } else if (formData.Address.trim().length > 500) {
      tempErrors.Address = "Address is too long (max 500 characters)";
      isValid = false;
    }

    // Transaction Details validation
    if (!formData.TransactionDetails.trim()) {
      tempErrors.TransactionDetails = "Transaction details are required";
      isValid = false;
    } else if (formData.TransactionDetails.trim().length < 10) {
      tempErrors.TransactionDetails = "Please provide complete transaction details (at least 10 characters)";
      isValid = false;
    }

    // Photo validation
    if (!formData.photo) {
      tempErrors.photo = "Passport photo is required";
      isValid = false;
    }

    if (!formData.paymentProof) {
      tempErrors.paymentProof = "Payment proof screenshot or PDF is required";
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to top or show alert if needed, but inline errors will show
      return; 
    }

    setRegStatus('submitting');

    try {
      const result = await submitMembershipApplication({
        applicant_name: formData.Name,
        institution: formData.Institution,
        qualification: formData.Qualification,
        practicing_pathologist: formData.Practicing,
        student_status: formData.StudentStatus,
        address: formData.Address,
        email: formData.Email,
        phone: formData.Phone,
        membership_type: formData.MembershipType,
        transaction_details: formData.TransactionDetails,
        interest_category: formData.Interest,
        photoFile: formData.photo,
        paymentProofFile: formData.paymentProof,
      });
      if (!result.ok) throw new Error(result.message);
      setRegStatus('success');
      setFormData({
        Name: '', Institution: '', Qualification: '', Practicing: 'Yes', StudentStatus: '', 
        Address: '', Email: '', Phone: '', MembershipType: 'life', 
        Amount: '5,000 INR', TransactionDetails: '', Interest: 'I am an academic pathologist', photo: null, paymentProof: null,
      });
      setErrors({});
    } catch (error) {
      console.error("Error:", error);
      setRegStatus('error');
    }
  };

  // --- HANDLERS: CHECK STATUS ---
  const handleCheckStatus = async (e) => {
    e.preventDefault();
    if (!checkEmail.trim()) {
      alert("Please enter an email address");
      return;
    }
    // Validate email format
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(checkEmail)) {
      alert("Please enter a valid email address");
      return;
    }
    setStatusResult('loading');
    
    try {
      const data = await lookupMembershipStatus(checkEmail);
      
      if (data?.result === 'found') {
        setMemberData(data.application);
        setStatusResult('found');
      } else {
        setStatusResult('not_found');
      }
    } catch (error) {
      console.error("Check Status Error:", error);
      setStatusResult('error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
      className="container mx-auto px-4 py-12"
    >
      <SEO 
        title="Join Membership" 
        description="Register for DC-IAPM membership. Apply for Life, Associate, or Ad Hoc membership."
        keywords="join DC-IAPM, membership registration, pathology society application"
      />
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header with Tabs */}
        <div className="bg-primary text-white p-8 text-center">
          <h1 className="text-3xl font-bold font-display">Membership Portal</h1>
          <p className="mt-2 opacity-90 mb-6">Join the Society or Manage your Membership</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => setActiveTab('register')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                activeTab === 'register' 
                ? 'bg-white text-primary shadow-lg' 
                : 'bg-primary-dark text-white/70 border border-white/30 hover:bg-primary-light'
              }`}
            >
              New Application
            </button>
            <button 
              onClick={() => setActiveTab('status')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                activeTab === 'status' 
                ? 'bg-white text-primary shadow-lg' 
                : 'bg-primary-dark text-white/70 border border-white/30 hover:bg-primary-light'
              }`}
            >
              Check Status / Download
            </button>
            <button 
              onClick={() => setActiveTab('promo')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                activeTab === 'promo' 
                ? 'bg-white text-primary shadow-lg' 
                : 'bg-primary-dark text-white/70 border border-white/30 hover:bg-primary-light'
              }`}
            >
              Promotional Drive
            </button>
          </div>
        </div>

        {/* === TAB 1: NEW REGISTRATION === */}
        {activeTab === 'register' && (
          <div className="grid lg:grid-cols-3">
            {/* Left Side: Bank Details */}
            <div className="lg:col-span-1 p-8 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-bold text-primary dark:text-white mb-6 flex items-center">
                <span className="material-symbols-outlined mr-2">payments</span>
                Payment Information
              </h3>
              
              <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
                <div className="bg-white dark:bg-gray-600 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-500">
                  <h4 className="font-bold text-lg mb-3 text-primary dark:text-white border-b pb-2">Bank Transfer</h4>
                  <div className="space-y-2">
                      <p><strong>Account Name:</strong> DELHI CH OF IAPM</p>
                      <p><strong>Account No:</strong> 1210463576</p>
                      <p><strong>Bank Details:</strong> CENTRAL BANK OF INDIA</p>
                      <p><strong>Branch:</strong> LADY HARDINGE MED COLL AND HOSPITAL BRANCH, OPP PANCHKUIAN ROAD</p>
                      <p><strong>IFSC Code:</strong> CBIN0283462</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-600 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-500 text-center">
                  <h4 className="font-bold text-lg mb-3 text-primary dark:text-white border-b pb-2 text-left">Scan QR to Pay</h4>
                  <a href={PaymentQR} target="_blank" rel="noopener noreferrer" className="w-full block">
                    <img 
                      src={PaymentQR} 
                      alt="Payment QR Code" 
                      className="w-full h-auto mx-auto object-contain border rounded-lg mb-2"
                      onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerHTML+='<p class="text-red-500 text-xs">QR Code image not found</p>'}}
                    />
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-300">Accepts UPI, GPay, Paytm</p>
                </div>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="lg:col-span-2 p-8">
              {regStatus === 'success' ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-green-500 mb-4">check_circle</span>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Application Submitted!</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    We have received your details. You can check your status in the "Check Status" tab.
                  </p>
                  <button onClick={() => setRegStatus(null)} className="mt-6 text-primary font-bold hover:underline">
                    Submit another response
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                      <div>
                          <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            name="Name" 
                            value={formData.Name} 
                            onChange={handleChange} 
                            className={`form-input ${errors.Name ? 'border-red-500' : ''}`} 
                            maxLength="100"
                            placeholder="Enter your full name"
                          />
                          {errors.Name && <p className="text-red-500 text-xs mt-1">{errors.Name}</p>}
                      </div>
                      <div>
                           <label className="form-label">Passport Photo (Max 1MB) <span className="text-red-500">*</span></label>
                           <input 
                             type="file" 
                             accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
                             onChange={(event) => handleFileChange(event, 'photo')} 
                             className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                           />
                           {errors.photo && <p className="text-red-500 text-xs mt-1">{errors.photo}</p>}
                      </div>
                  </div>

                  <div>
                      <label className="form-label">Qualification <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="Qualification" 
                        value={formData.Qualification} 
                        onChange={handleChange} 
                        className={`form-input ${errors.Qualification ? 'border-red-500' : ''}`} 
                        placeholder="e.g. MD Pathology, DNB"
                        maxLength="200"
                      />
                      {errors.Qualification && <p className="text-red-500 text-xs mt-1">{errors.Qualification}</p>}
                  </div>

                  <div>
                      <label className="form-label">Institution & Country <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="Institution" 
                        value={formData.Institution} 
                        onChange={handleChange} 
                        className={`form-input ${errors.Institution ? 'border-red-500' : ''}`} 
                        maxLength="200"
                        placeholder="Your institution name and country"
                      />
                      {errors.Institution && <p className="text-red-500 text-xs mt-1">{errors.Institution}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                      <div>
                          <label className="form-label">Email ID <span className="text-red-500">*</span></label>
                          <input 
                            type="email" 
                            name="Email" 
                            value={formData.Email} 
                            onChange={handleChange} 
                            className={`form-input ${errors.Email ? 'border-red-500' : ''}`} 
                            maxLength="100"
                            placeholder="youremail@example.com"
                          />
                          {errors.Email && <p className="text-red-500 text-xs mt-1">{errors.Email}</p>}
                      </div>
                      <div>
                          <label className="form-label">Phone Number <span className="text-red-500">*</span></label>
                          <input 
                            type="tel" 
                            name="Phone" 
                            value={formData.Phone} 
                            onChange={handleChange} 
                            className={`form-input ${errors.Phone ? 'border-red-500' : ''}`} 
                            maxLength="15"
                            placeholder="10-digit phone number"
                            pattern="[0-9]*"
                          />
                          {errors.Phone && <p className="text-red-500 text-xs mt-1">{errors.Phone}</p>}
                      </div>
                  </div>

                  <div>
                      <label className="form-label">Your Address <span className="text-red-500">*</span></label>
                      <textarea 
                        name="Address" 
                        value={formData.Address} 
                        onChange={handleChange} 
                        rows="2" 
                        className={`form-input ${errors.Address ? 'border-red-500' : ''}`}
                        maxLength="500"
                        placeholder="Enter your complete address"
                      ></textarea>
                      {errors.Address && <p className="text-red-500 text-xs mt-1">{errors.Address}</p>}
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4 border border-gray-200 dark:border-gray-600">
                      <div>
                          <label className="form-label mb-2 block">Are you a practicing Pathologist? <span className="text-red-500">*</span></label>
                          <div className="flex gap-4">
                              <label className="flex items-center"><input type="radio" name="Practicing" value="Yes" checked={formData.Practicing === 'Yes'} onChange={handleChange} className="mr-2" /> Yes</label>
                              <label className="flex items-center"><input type="radio" name="Practicing" value="No" checked={formData.Practicing === 'No'} onChange={handleChange} className="mr-2" /> No</label>
                          </div>
                      </div>
                      <div>
                          <label className="form-label">If PG student, PhD student or Fellow, specify subspecialty:</label>
                          <input 
                            type="text" 
                            name="StudentStatus" 
                            value={formData.StudentStatus} 
                            onChange={handleChange} 
                            className="form-input" 
                            placeholder="e.g., 2nd Year PG, GI Pathology Fellow" 
                            maxLength="200"
                          />
                      </div>
                  </div>

                  <div className="p-4 border-2 border-gold-DEFAULT/30 rounded-lg space-y-4 bg-yellow-50/50 dark:bg-gray-800">
                      <h4 className="font-bold text-primary dark:text-white border-b border-gold-DEFAULT/20 pb-2">Payment Details</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                          <div>
                              <label className="form-label">Membership Type <span className="text-red-500">*</span></label>
                              <select name="MembershipType" value={formData.MembershipType} onChange={handleChange} className="form-input">
                                  {membershipPlans.map((plan) => (
                                    <option key={plan.value} value={plan.value}>{plan.label}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="form-label">Amount Paid <span className="text-red-500">*</span></label>
                              <input name="Amount" value={formData.Amount} readOnly className="form-input bg-gray-100 font-bold" />
                          </div>
                      </div>
                      <div>
                          <label className="form-label">Transaction ID & Date <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            name="TransactionDetails" 
                            value={formData.TransactionDetails} 
                            onChange={handleChange} 
                            className={`form-input ${errors.TransactionDetails ? 'border-red-500' : ''}`} 
                            placeholder="e.g., UPI Ref 123456, Date: 25/11/2025" 
                            maxLength="200"
                          />
                          {errors.TransactionDetails && <p className="text-red-500 text-xs mt-1">{errors.TransactionDetails}</p>}
                      </div>
                      <div>
                          <label className="form-label">Payment Screenshot / Proof <span className="text-red-500">*</span></label>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                            onChange={(event) => handleFileChange(event, 'paymentProof')}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {errors.paymentProof && <p className="text-red-500 text-xs mt-1">{errors.paymentProof}</p>}
                      </div>
                  </div>

                    <div>
                      <label className="form-label">Category <span className="text-red-500">*</span></label>
                      <select name="Interest" value={formData.Interest} onChange={handleChange} className="form-input">
                        <option>I am an academic pathologist</option>
                        <option>I am a practicing pathologist</option>
                        <option>I am a post graduate student/ fellow</option>
                        <option>I am a pathologist working outside India</option>
                      </select>
                    </div>

                  <button 
                    type="submit" 
                    disabled={regStatus === 'submitting'}
                    className="w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-blue-900 transition-colors shadow-lg disabled:opacity-50 text-lg"
                  >
                    {regStatus === 'submitting' ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* === TAB 2: CHECK STATUS === */}
        {activeTab === 'status' && (
          <div className="p-12 max-w-2xl mx-auto min-h-[400px]">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Check Application Status</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                Enter the email address you used during registration to check your status and download documents.
              </p>
            </div>

            <div className="flex gap-3 mb-8">
              <input 
                type="email" 
                placeholder="Enter your registered email" 
                value={checkEmail}
                onChange={(e) => setCheckEmail(e.target.value)}
                className="flex-grow px-4 py-3 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-primary outline-none"
              />
              <button 
                onClick={handleCheckStatus}
                disabled={statusResult === 'loading'}
                className="bg-gold-DEFAULT text-primary font-bold px-6 py-3 rounded hover:bg-yellow-500 disabled:opacity-50"
              >
                {statusResult === 'loading' ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            {/* RESULTS DISPLAY */}
            {statusResult === 'found' && memberData && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 dark:bg-gray-700 p-8 rounded-xl border border-gray-200 dark:border-gray-600 text-center">
                <h3 className="text-xl font-bold text-primary dark:text-white mb-2">Hello, {memberData.applicant_name}</h3>
                
                <div className="my-6">
                   <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                     memberData.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                   }`}>
                     Application Status: {membershipStatusLabels[memberData.status] || memberData.status}
                   </span>
                </div>

                {memberData.status === 'approved' ? (
                  <div className="space-y-4">
                    <p className="text-green-600 dark:text-green-300 font-medium">
                      Congratulations! Your membership has been approved.
                    </p>
                    {memberData.membership_number && (
                      <p className="font-bold text-primary dark:text-white">Membership No: {memberData.membership_number}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {memberData.receipt_url && (
                        <a href={memberData.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded hover:bg-blue-900 transition-colors">
                          <span className="material-symbols-outlined">receipt</span> Download Receipt
                        </a>
                      )}
                      {memberData.certificate_url && (
                        <a href={memberData.certificate_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-gold-DEFAULT text-primary py-3 px-4 rounded hover:bg-yellow-500 transition-colors">
                          <span className="material-symbols-outlined">verified</span> Download Certificate
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded text-sm text-left">
                    <p className="font-bold mb-1">Your application is currently under verification.</p>
                    <p>The Secretary is verifying your payment details. Once authorized, you will be able to download your Receipt and Certificate from this page.</p>
                    <p className="mt-2 italic text-xs">Please check back in a few days.</p>
                  </div>
                )}
              </motion.div>
            )}

            {statusResult === 'not_found' && (
              <div className="text-center text-red-500 bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-100 dark:border-red-800">
                <p className="font-bold">No application found.</p>
                <p className="text-sm">Please check the email spelling or ensure you have submitted a registration form.</p>
              </div>
            )}

            {statusResult === 'error' && (
              <div className="text-center text-red-500">
                <p>Unable to connect to the server. Please try again later.</p>
              </div>
            )}
          </div>
        )}

        {/* === TAB 3: PROMOTIONAL DRIVE === */}
        {activeTab === 'promo' && (
          <div className="p-12 max-w-3xl mx-auto min-h-[300px]">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-primary mb-3">Promotional Membership Drive</h2>
              <p className="text-gray-700 mb-4">
                Pathologists can become members by paying only Rs 1,500 until Dec 31, 2026.
              </p>
              <div className="mt-5 rounded-lg bg-white p-4 text-left text-sm text-gray-700">
                <p className="font-bold text-primary">Membership numbering rule</p>
                <p className="mt-2">Until 31 Dec 2026, Rs 1,500 promotional payments receive an L-series number.</p>
                <p>From 1 Jan 2027, Rs 5,000 Life members receive L-series, Rs 1,500 Ad Hoc members receive AH-series, and USD 200 Overseas members receive OS-series numbers.</p>
              </div>
              <p className="text-sm text-gray-600">
                Please select the appropriate membership type in the application form and complete the payment before the deadline.
              </p>
            </div>
          </div>
        )}

      </div>
      
      {/* CSS for form elements */}
      <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 600; color: #4B5563; margin-bottom: 0.25rem; }
        .dark .form-label { color: #D1D5DB; }
        .form-input { width: 100%; padding: 0.5rem 1rem; border-radius: 0.375rem; border: 1px solid #D1D5DB; background-color: white; color: #111827; }
        .dark .form-input { background-color: #374151; border-color: #4B5563; color: white; }
        .form-input:focus { outline: none; ring: 2px solid #D4AF37; border-color: transparent; }
      `}</style>
    </motion.div>
  );
};

export default MembershipRegistration;
