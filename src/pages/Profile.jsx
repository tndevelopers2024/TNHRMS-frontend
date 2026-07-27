import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DocumentViewerModal } from "../components/DocumentViewerModal";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Edit3, Upload, File, Save, Download, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSocket } from "../context/SocketContext";

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({});
  const [initialFormData, setInitialFormData] = useState({});
  const [filesData, setFilesData] = useState({}); // For storing File objects
  const [isSaving, setIsSaving] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, url: '' });

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const fetchProfile = () => {
    if (userInfo._id) {
      fetch(`${import.meta.env.VITE_API_URL}/api/employee/profile/${userInfo._id}`)
        .then(res => res.json())
        .then(data => {
          setProfileData(data);
          // Initialize form data
          const initial = {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            dob: data.dob ? data.dob.substring(0, 10) : '',
            gender: data.gender || '',
            maritalStatus: data.maritalStatus || '',
            bloodGroup: data.bloodGroup || '',
            
            // Banking
            accountHolderName: data.bankingDetails?.accountHolderName || '',
            accountNumber: data.bankingDetails?.accountNumber || '',
            bankName: data.bankingDetails?.bankName || '',
            ifscCode: data.bankingDetails?.ifscCode || '',
            uan: data.bankingDetails?.uan || '',
            
            // Emergency
            emergencyContactName: data.emergencyContact?.name || '',
            emergencyContactRelationship: data.emergencyContact?.relationship || '',
            emergencyContactPhone: data.emergencyContact?.phone || '',
            
            // Professional References
            professionalReferences: data.professionalReferences || []
          };
          setFormData(initial);
          setInitialFormData(initial);
        })
        .catch(err => console.error(err));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleNotif = (notif) => {
      if (notif.type === 'profile_update') {
        fetchProfile();
      }
    };
    socket.on('notification', handleNotif);
    return () => socket.off('notification', handleNotif);
  }, [socket]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFilesData({ ...filesData, [e.target.name]: e.target.files[0] });
    }
  };

  const handleReferenceChange = (index, field, value) => {
    const newRefs = [...(formData.professionalReferences || [])];
    if (!newRefs[index]) newRefs[index] = {};
    newRefs[index][field] = value;
    setFormData({ ...formData, professionalReferences: newRefs });
  };

  const addReference = () => {
    setFormData({
      ...formData,
      professionalReferences: [...(formData.professionalReferences || []), {}]
    });
  };
  
  const removeReference = (index) => {
    const newRefs = [...(formData.professionalReferences || [])];
    newRefs.splice(index, 1);
    setFormData({ ...formData, professionalReferences: newRefs });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = new FormData();
      
      // Append all text fields
      Object.keys(formData).forEach(key => {
        if (key === 'professionalReferences') {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });
      
      // Append all files
      Object.keys(filesData).forEach(key => {
        data.append(key, filesData[key]);
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/profile-details/${userInfo._id}`, {
        method: 'POST',
        body: data // Don't set Content-Type header, browser does it automatically for FormData
      });

      if (res.ok) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
        setFilesData({});
        fetchProfile(); // Reload data to show updated files
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const renderFileUploader = (fieldName, label, description) => {
    const pendingFile = profileData?.pendingProfileUpdates?.documents?.[fieldName];
    const approvedFile = profileData?.documents?.[fieldName];
    const existingFile = pendingFile || approvedFile;
    return (
      <div className="space-y-2 border p-4 rounded-lg bg-gray-50/50">
        <Label className="text-base font-semibold text-gray-900">{label}</Label>
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        
        {isEditing ? (
          <div className="mt-2">
            <Input type="file" name={fieldName} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="bg-white" />
            {filesData[fieldName] && <p className="text-xs text-emerald-600 mt-1">File selected for upload</p>}
            {existingFile && !filesData[fieldName] && (
              <p className="text-xs text-blue-600 mt-1 flex items-center">
                <File className="w-3 h-3 mr-1" /> Existing file will be kept
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2">
            {existingFile ? (
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setViewerData({ isOpen: true, url: `${import.meta.env.VITE_API_URL}${existingFile}` }); }}
                className="inline-flex items-center text-sm text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-md"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> View Uploaded Document
              </button>
            ) : (
              <span className="text-sm text-gray-400 italic">Not provided</span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!profileData) {
    return <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;
  }

  const tabs = [
    { id: 'personal', label: 'Personal & Contact' },
    { id: 'identity', label: 'Identity Proofs' },
    { id: 'banking', label: 'Banking & Payroll' },
    { id: 'education', label: 'Educational Docs' },
    { id: 'employment', label: 'Employment & Refs' },
  ];

  const hasChanges = (() => {
    if (Object.keys(filesData).length > 0) return true;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your complete personal and professional information.</p>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => {
              setIsEditing(true);
              setActiveTab('personal');
            }} 
            className="bg-primary hover:bg-primary/90 text-white shadow-sm"
            disabled={!!profileData.pendingProfileUpdates}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              fetchProfile(); // Reset form
              setFilesData({});
            }}>Cancel</Button>
          </div>
        )}
      </div>

      {profileData.documentStatus === 'Pending Upload' && !isEditing && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start mb-6 animate-in fade-in">
           <svg className="w-5 h-5 text-rose-500 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">Action Required: Document Upload</h3>
            <p className="text-sm mt-1 text-rose-700/90">Please upload your required identity and educational documents. Your account is restricted until an admin reviews and approves your documents.</p>
          </div>
        </div>
      )}
      
      {profileData.documentStatus === 'Pending Approval' && !isEditing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-start mb-6 animate-in fade-in">
           <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">Documents Under Review</h3>
            <p className="text-sm mt-1 text-blue-700/90">Your uploaded documents are currently being reviewed by an admin. You will gain full access to the dashboard once approved.</p>
          </div>
        </div>
      )}

      {profileData.documentStatus === 'Rejected' && !isEditing && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start mb-6 animate-in fade-in">
           <svg className="w-5 h-5 text-rose-500 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">Documents Rejected</h3>
            <p className="text-sm mt-1 text-rose-700/90">Your previous document submission was rejected. Please review your details and re-upload the correct documents.</p>
            {profileData.rejectionReason && (
              <div className="mt-2 p-3 bg-white/60 rounded-lg border border-rose-100 text-sm italic">
                <span className="font-semibold not-italic">Admin Comments: </span>{profileData.rejectionReason}
              </div>
            )}
          </div>
        </div>
      )}

      {profileData.pendingProfileUpdates && profileData.documentStatus === 'Approved' && !isEditing && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start animate-in fade-in">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">Update Pending Approval</h3>
            <p className="text-sm mt-1 text-amber-700/90">Your profile changes have been submitted and are waiting for an administrator's approval. You cannot make further edits until these are reviewed.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Profile Summary */}
        <Card className="lg:col-span-1 border-0 shadow-sm relative overflow-hidden h-fit sticky top-24">
          <div className="h-24 bg-gradient-to-r from-primary to-secondary"></div>
          <CardContent className="px-6 pb-6 relative pt-0">
            <div className="flex flex-col items-center -mt-12 text-center">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                <img 
                  src={profileData.profileImage || `https://api.dicebear.com/7.x/notionists/svg?seed=${profileData.name.replace(' ', '')}&backgroundColor=f3f4f6`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full bg-gray-100 object-cover"
                />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-3">{profileData.name}</h2>
              <p className="text-primary font-medium text-sm">{profileData.designation || 'Employee'}</p>
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center text-xs text-gray-600">
                <Briefcase className="w-3 h-3 mr-3 text-gray-400" />
                <span>{profileData.employeeId || `EMP-${profileData._id.slice(-5).toUpperCase()}`}</span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <Mail className="w-3 h-3 mr-3 text-gray-400" />
                <span className="truncate" title={profileData.email}>{profileData.email}</span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <Phone className="w-3 h-3 mr-3 text-gray-400" />
                <span>{profileData.phone || 'N/A'}</span>
              </div>
            </div>

            {profileData?.documents?.offerLetter && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={(e) => { e.preventDefault(); setViewerData({ isOpen: true, url: profileData.documents.offerLetter }); }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" /> View Offer Letter
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Area: Tabs & Content */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Custom Tabs Navigation */}
          <div className="flex overflow-x-auto space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Card className="border-0 shadow-sm min-h-[500px]">
            <CardHeader className="pb-4 border-b border-gray-50">
              <CardTitle>{tabs.find(t => t.id === activeTab)?.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* TAB 1: Personal & Contact Info */}
              {activeTab === 'personal' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-primary"/> Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Full Name (as per ID)</Label>
                        <Input name="name" value={formData.name} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <DatePicker
                          selected={formData.dob ? new Date(formData.dob) : null}
                          onChange={(date) => {
                            if (date) {
                              const tzOffset = date.getTimezoneOffset() * 60000;
                              const localISOTime = new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
                              handleInputChange({ target: { name: 'dob', value: localISOTime } });
                            } else {
                              handleInputChange({ target: { name: 'dob', value: '' } });
                            }
                          }}
                          disabled={!isEditing}
                          dateFormat="MM/dd/yyyy"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                          wrapperClassName="w-full"
                          placeholderText="Select a date"
                          showYearDropdown
                          showMonthDropdown
                          dropdownMode="select"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={!isEditing} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Marital Status</Label>
                        <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} disabled={!isEditing} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                          <option value="">Select</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group</Label>
                        <Input name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g. O+" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2 text-primary"/> Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Mobile Number</Label>
                        <Input name="phone" value={formData.phone} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Personal Email Address</Label>
                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Residential Address</Label>
                        <Input name="address" value={formData.address} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><Shield className="w-5 h-5 mr-2 text-primary"/> Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Contact Name</Label>
                        <Input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Input name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Identity Proofs */}
              {activeTab === 'identity' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderFileUploader('panCard', 'PAN Card', 'For tax deductions and payroll')}
                    {renderFileUploader('aadhaarCard', 'Aadhaar Card', 'For EPF registration and identity verification')}
                    {renderFileUploader('passport', 'Passport / Driver\'s License', 'For address and age proof')}
                    {renderFileUploader('photograph', 'Passport-Size Photographs', 'Recent color photographs')}
                  </div>
                </div>
              )}

              {/* TAB 3: Banking & Payroll */}
              {activeTab === 'banking' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><Briefcase className="w-5 h-5 mr-2 text-primary"/> Bank Account Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input name="accountHolderName" value={formData.accountHolderName} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input name="bankName" value={formData.bankName} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>UAN (Universal Account Number)</Label>
                        <Input name="uan" value={formData.uan} onChange={handleInputChange} disabled={!isEditing} placeholder="For EPF transfer (if applicable)" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderFileUploader('cancelledCheque', 'Cancelled Cheque / Passbook', 'For bank account verification')}
                    {renderFileUploader('form16', 'Previous Employer Form 16', 'For income tax calculation')}
                  </div>
                </div>
              )}

              {/* TAB 4: Educational Docs */}
              {activeTab === 'education' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderFileUploader('tenthMarkSheet', '10th Standard Certificate', 'Mark sheet or certificate')}
                  {renderFileUploader('twelfthMarkSheet', '12th Standard Certificate', 'If applicable')}
                  {renderFileUploader('diplomaCertificate', 'Diploma Certificate', 'If applicable')}
                  {renderFileUploader('degreeCertificate', 'Degree Certificate', 'Bachelors / Undergrad')}
                  {renderFileUploader('degreeMarkSheet', 'Degree Mark Sheets', 'All semesters combined PDF')}
                  {renderFileUploader('postgraduateCertificate', 'Postgraduate Certificate', 'If applicable')}
                </div>
              )}

              {/* TAB 5: Employment & Refs */}
              {activeTab === 'employment' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><Briefcase className="w-5 h-5 mr-2 text-primary"/> Previous Employment Docs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderFileUploader('relievingLetter', 'Relieving Letter', 'From last employer')}
                      {renderFileUploader('experienceCertificate', 'Experience Certificate', '')}
                      {renderFileUploader('salarySlip', 'Last 3 Months Salary Slips', 'Combined in one PDF preferably')}
                      {renderFileUploader('previousOfferLetter', 'Previous Offer Letter', '(Optional)')}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center"><User className="w-5 h-5 mr-2 text-primary"/> Professional References</h3>
                      {isEditing && (
                        <Button type="button" variant="outline" size="sm" onClick={addReference}>Add Reference</Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">2-3 Former Managers or Colleagues</p>
                    
                    <div className="space-y-6">
                      {(formData.professionalReferences || []).length === 0 && (
                        <p className="text-sm text-gray-400 italic">No references added yet.</p>
                      )}
                      {(formData.professionalReferences || []).map((ref, index) => (
                        <div key={index} className="p-4 border rounded-xl bg-gray-50 relative">
                          {isEditing && (
                            <button type="button" onClick={() => removeReference(index)} className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 text-sm font-medium">Remove</button>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input value={ref.name || ''} onChange={(e) => handleReferenceChange(index, 'name', e.target.value)} disabled={!isEditing} className="bg-white h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Designation</Label>
                              <Input value={ref.designation || ''} onChange={(e) => handleReferenceChange(index, 'designation', e.target.value)} disabled={!isEditing} className="bg-white h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Company</Label>
                              <Input value={ref.company || ''} onChange={(e) => handleReferenceChange(index, 'company', e.target.value)} disabled={!isEditing} className="bg-white h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Contact Number</Label>
                              <Input value={ref.contactNumber || ''} onChange={(e) => handleReferenceChange(index, 'contactNumber', e.target.value)} disabled={!isEditing} className="bg-white h-8 text-sm" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <Label className="text-xs">Email Address</Label>
                              <Input type="email" value={ref.email || ''} onChange={(e) => handleReferenceChange(index, 'email', e.target.value)} disabled={!isEditing} className="bg-white h-8 text-sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              
              {/* Step Navigation */}
              {isEditing && (
                <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(t => t.id === activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1].id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={tabs.findIndex(t => t.id === activeTab) === 0}
                  >
                    Previous Step
                  </Button>

                  {tabs.findIndex(t => t.id === activeTab) === tabs.length - 1 ? (
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving || !hasChanges} 
                      className={`text-white shadow-sm ${hasChanges ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        const currentIndex = tabs.findIndex(t => t.id === activeTab);
                        if (currentIndex < tabs.length - 1) {
                          setActiveTab(tabs[currentIndex + 1].id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      Next Step
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <DocumentViewerModal 
        isOpen={viewerData.isOpen} 
        fileUrl={viewerData.url} 
        onClose={() => setViewerData({ isOpen: false, url: '' })} 
      />
    </div>
  )
}
