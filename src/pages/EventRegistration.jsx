import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import PaymentQR from '../images/qr.png';

const EventRegistration = () => {
  const location = useLocation();
  const preSelectedEventTitle = location.state?.selectedEvent;

  // 1. Data State
  const [activeEvents, setActiveEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // 2. Selected Event State
  const [selectedEventData, setSelectedEventData] = useState(null);

  // 3. Form State
  const [formData, setFormData] = useState({
    action: 'register_event',
    EventName: '',
    Name: '',
    Institute: '',
    Designation: 'PG student',
    City: '',
    Mobile: '',
    Email: '',
    IsMember: 'No',
    RegType: '',
    PaymentMode: 'UPI',
    TransactionID: '',
    TransactionDate: '',
    screenshot: null
  });

  const [status, setStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_API_URL;

  // --- HELPER TO RENDER BOLD TEXT ---
  // This function looks for text wrapped in *asterisks* and makes it bold
  const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      // Split line by the asterisk markers
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <div key={index} className="min-h-[1.2rem] mb-1">
          {parts.map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              // Remove asterisks and make bold
              return <strong key={i} className="text-primary dark:text-white font-bold">{part.slice(1, -1)}</strong>;
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    });
  };

  // --- FETCH EVENTS ---
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ action: "get_events" })
        });
        const data = await response.json();

        if (data.result === 'success' && Array.isArray(data.data)) {
          setActiveEvents(data.data);

          let initialEvent = null;
          if (preSelectedEventTitle) {
            initialEvent = data.data.find(e => e.title === preSelectedEventTitle);
          }
          if (!initialEvent && data.data.length > 0) {
            initialEvent = data.data[0];
          }

          if (initialEvent) {
            updateSelectedEvent(initialEvent);
          }
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, [preSelectedEventTitle]);

  const updateSelectedEvent = (eventObj) => {
    setSelectedEventData(eventObj);
    setFormData(prev => ({
      ...prev,
      EventName: eventObj.title,
      RegType: ''
    }));
  };

  const handleEventChange = (e) => {
    const newTitle = e.target.value;
    const eventObj = activeEvents.find(ev => ev.title === newTitle);
    if (eventObj) {
      updateSelectedEvent(eventObj);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, screenshot: "File size must be less than 10MB" });
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, screenshot: { data: reader.result, type: file.type } });
        if (errors.screenshot) setErrors({ ...errors, screenshot: null });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    let tempErrors = {};
    let isValid = true;

    if (!formData.EventName) { tempErrors.EventName = "Please select an event"; isValid = false; }
    if (!formData.Name.trim()) { tempErrors.Name = "Name is required"; isValid = false; }
    if (!formData.Institute.trim()) { tempErrors.Institute = "Institute is required"; isValid = false; }
    if (!formData.City.trim()) { tempErrors.City = "City is required"; isValid = false; }
    if (!formData.Mobile.trim() || !/^\d{10}$/.test(formData.Mobile)) {
      tempErrors.Mobile = "Valid 10-digit Mobile is required";
      isValid = false;
    }
    if (!formData.Email.trim()) { tempErrors.Email = "Email is required"; isValid = false; }
    if (!formData.RegType.trim()) { tempErrors.RegType = "Registration category is required"; isValid = false; }
    if (!formData.TransactionID.trim()) { tempErrors.TransactionID = "Transaction ID is required"; isValid = false; }
    if (!formData.TransactionDate) { tempErrors.TransactionDate = "Transaction Date is required"; isValid = false; }
    if (!formData.screenshot) { tempErrors.screenshot = "Payment screenshot is required"; isValid = false; }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setStatus('submitting');

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setStatus('success');
    } catch (error) {
      console.error("Error:", error);
      setStatus('error');
    }
  };

  const getCategories = () => {
    if (selectedEventData && selectedEventData.categories) {
      return selectedEventData.categories.split(',').map(c => c.trim());
    }
    return ["Workshop Only", "CME Only", "Workshop + CME"];
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-4 py-12">
      <SEO 
        title="Event Registration" 
        description="Register for upcoming DC-IAPM events, workshops, and conferences."
        keywords="event registration, medical conference registration, pathology workshop"
      />
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">

        <div className="bg-secondary text-primary p-8 text-center border-b-4 border-gold-DEFAULT">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-2">
            {selectedEventData ? selectedEventData.title : "Event Registration"}
          </h1>
          <p className="font-semibold text-lg opacity-90 mt-2">
            {selectedEventData ? (
              <>
                <span className="material-symbols-outlined align-middle mr-1 text-sm">event</span>
                {selectedEventData.date}
                <span className="mx-3">|</span>
                <span className="material-symbols-outlined align-middle mr-1 text-sm">location_on</span>
                {selectedEventData.location}
              </>
            ) : "Select an event to proceed"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3">

          {/* --- SIDEBAR --- */}
          <div className="lg:col-span-1 p-8 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600">

            {/* 1. DYNAMIC FEE STRUCTURE WITH BOLD SUPPORT */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-primary dark:text-white mb-4 flex items-center">
                <span className="material-symbols-outlined mr-2">sell</span> Registration Fees
              </h3>
              <div className="bg-white dark:bg-gray-600 p-4 rounded-lg border border-gray-200 dark:border-gray-500 shadow-sm">
                {selectedEventData && selectedEventData.fee_details ? (
                  <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                    {/* USING THE NEW FORMATTING FUNCTION */}
                    {renderFormattedText(selectedEventData.fee_details)}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Please refer to the official brochure for fee details.</p>
                )}
              </div>
            </div>

            {/* 2. BANK DETAILS */}
            <h3 className="text-xl font-bold text-primary dark:text-white mb-4 flex items-center">
              <span className="material-symbols-outlined mr-2">account_balance</span> Bank Details
            </h3>

            <div className="bg-white dark:bg-gray-600 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-500 text-center">
              <p className="font-bold text-left mb-2 border-b pb-2">Bank Transfer / UPI</p>
              <div className="text-sm text-left space-y-2 mb-4">
                <p><strong>Account Name:</strong> DELHI CH OF IAPM</p>
                <p><strong>A/c No:</strong> 1210463576</p>
                <p><strong>Bank:</strong> CENTRAL BANK OF INDIA</p>
                <p><strong>Branch:</strong> LADY HARDINGE MED COLL AND HOSPITAL BRANCH, OPP PANCHKUIAN ROAD</p>
                <p><strong>IFSC:</strong> CBIN0283462</p>
              </div>
              <div className="flex flex-col items-center pt-2 border-t">
                <a href={PaymentQR} target="_blank" rel="noopener noreferrer" className="w-full block">
                  <img src={PaymentQR} className="w-full h-auto border rounded mb-1" alt="QR Code" />
                </a>
                <p className="text-xs font-bold text-primary dark:text-white">Scan to Pay (Click to enlarge)</p>
              </div>
            </div>
          </div>

          {/* --- FORM --- */}
          <div className="lg:col-span-2 p-8">
            {status === 'success' ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-5xl text-green-600">check_circle</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Registration Successful!</h3>
                <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                  Thank you for registering for <br />
                  <span className="font-bold text-primary dark:text-gold-light">{formData.EventName}</span>
                </p>
                <button onClick={() => window.location.reload()} className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-blue-900 transition-shadow shadow-lg">
                  Register Another Person
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border-l-4 border-primary dark:border-gold-DEFAULT">
                  <label className="form-label text-base font-bold text-primary dark:text-white mb-1">
                    Select Event <span className="text-red-500">*</span>
                  </label>
                  {loadingEvents ? (
                    <p className="text-sm text-gray-500 animate-pulse">Loading active events...</p>
                  ) : (
                    <select
                      name="EventName"
                      value={formData.EventName}
                      onChange={handleEventChange}
                      className="form-input font-bold text-gray-800 h-12 border-2 border-blue-200 focus:border-primary"
                    >
                      {activeEvents.map((event, idx) => (
                        <option key={idx} value={event.title}>{event.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" name="Name" value={formData.Name} onChange={handleChange} className="form-input" />
                    {errors.Name && <p className="text-red-500 text-xs mt-1">{errors.Name}</p>}
                  </div>
                  <div>
                    <label className="form-label">Designation <span className="text-red-500">*</span></label>
                    <select name="Designation" value={formData.Designation} onChange={handleChange} className="form-input">
                      <option>PG student</option>
                      <option>Senior Resident / Fellow</option>
                      <option>Consultant/ Faculty</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Institute Name <span className="text-red-500">*</span></label>
                    <input type="text" name="Institute" value={formData.Institute} onChange={handleChange} className="form-input" />
                    {errors.Institute && <p className="text-red-500 text-xs mt-1">{errors.Institute}</p>}
                  </div>
                  <div>
                    <label className="form-label">City <span className="text-red-500">*</span></label>
                    <input type="text" name="City" value={formData.City} onChange={handleChange} className="form-input" />
                    {errors.City && <p className="text-red-500 text-xs mt-1">{errors.City}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Mobile Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="Mobile" value={formData.Mobile} onChange={handleChange} className="form-input" maxLength="10" />
                    {errors.Mobile && <p className="text-red-500 text-xs mt-1">{errors.Mobile}</p>}
                  </div>
                  <div>
                    <label className="form-label">Email ID <span className="text-red-500">*</span></label>
                    <input type="email" name="Email" value={formData.Email} onChange={handleChange} className="form-input" />
                    {errors.Email && <p className="text-red-500 text-xs mt-1">{errors.Email}</p>}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <label className="form-label mb-2">Are you a member of DC-IAPM? <span className="text-red-500">*</span></label>
                  <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer"><input type="radio" name="IsMember" value="Yes" checked={formData.IsMember === 'Yes'} onChange={handleChange} className="mr-2" /> Yes</label>
                    <label className="flex items-center cursor-pointer"><input type="radio" name="IsMember" value="No" checked={formData.IsMember === 'No'} onChange={handleChange} className="mr-2" /> No</label>
                  </div>
                </div>

                {/* DYNAMIC CATEGORY DROPDOWN */}
                <div>
                  <label className="form-label">Registration Category <span className="text-red-500">*</span></label>
                  <select name="RegType" value={formData.RegType} onChange={handleChange} className="form-input bg-yellow-50 dark:bg-gray-800 border-yellow-200">
                    <option value="">-- Select Category --</option>
                    {getCategories().map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.RegType && <p className="text-red-500 text-xs mt-1">{errors.RegType}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Transaction ID <span className="text-red-500">*</span></label>
                    <input type="text" name="TransactionID" value={formData.TransactionID} onChange={handleChange} className="form-input" placeholder="UTR / UPI Ref No." />
                    {errors.TransactionID && <p className="text-red-500 text-xs mt-1">{errors.TransactionID}</p>}
                  </div>
                  <div>
                    <label className="form-label">Transaction Date <span className="text-red-500">*</span></label>
                    <input type="date" name="TransactionDate" value={formData.TransactionDate} onChange={handleChange} className="form-input" />
                    {errors.TransactionDate && <p className="text-red-500 text-xs mt-1">{errors.TransactionDate}</p>}
                  </div>
                </div>

                <div>
                  <label className="form-label">Payment Screenshot <span className="text-red-500">*</span></label>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-primary hover:file:bg-yellow-500 cursor-pointer" />
                  {errors.screenshot && <p className="text-red-500 text-xs mt-1">{errors.screenshot}</p>}
                </div>

                <button type="submit" disabled={status === 'submitting'} className="w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-blue-900 transition-all shadow-lg disabled:opacity-50 text-lg mt-4">
                  {status === 'submitting' ? 'Submitting...' : 'Submit Registration'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .form-label { display: block; font-size: 0.9rem; font-weight: 700; color: #374151; margin-bottom: 0.35rem; }
        .dark .form-label { color: #E5E7EB; }
        .form-input { width: 100%; padding: 0.6rem 1rem; border-radius: 0.5rem; border: 1px solid #D1D5DB; background-color: white; color: #111827; transition: border-color 0.2s; }
        .dark .form-input { background-color: #1F2937; border-color: #4B5563; color: white; }
        .form-input:focus { outline: none; border-color: #D4AF37; ring: 1px solid #D4AF37; }
      `}</style>
    </motion.div>
  );
};

export default EventRegistration;