import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Edit3 } from "lucide-react";

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  useEffect(() => {
    if (userInfo._id) {
      fetch(`${import.meta.env.VITE_API_URL}/api/employee/profile/${userInfo._id}`)
        .then(res => res.json())
        .then(data => setProfileData(data))
        .catch(err => console.error(err));
    }
  }, []);

  if (!profileData) {
    return <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Basic Info Card */}
        <Card className="lg:col-span-1 border-0 shadow-sm relative overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary to-secondary"></div>
          <CardContent className="px-6 pb-6 relative pt-0">
            <div className="flex flex-col items-center -mt-16 text-center">
              <div className="w-32 h-32 bg-white rounded-full p-2 shadow-md">
                <img 
                  src={profileData.profileImage || `https://api.dicebear.com/7.x/notionists/svg?seed=${profileData.name.replace(' ', '')}&backgroundColor=f3f4f6`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full bg-gray-100 object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mt-4">{profileData.name}</h2>
              <p className="text-primary font-medium">{profileData.designation || 'Employee'}</p>
              
              <div className="inline-flex items-center mt-3 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                <Shield className="w-3 h-3 mr-1" /> Active Employee
              </div>
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <Briefcase className="w-4 h-4 mr-3 text-gray-400" />
                <span>EMP-{profileData._id.slice(-5).toUpperCase()}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-3 text-gray-400" />
                <span>{profileData.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-3 text-gray-400" />
                <span>{profileData.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                <span>{profileData.address || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                <span>{profileData.dob ? new Date(profileData.dob).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>Your role and employment information.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Department</p>
                  <p className="text-gray-900 font-semibold">{profileData.department || 'General'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Reporting Manager</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">A</div>
                    <p className="text-gray-900 font-semibold">Admin Team</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Date of Joining</p>
                  <div className="flex items-center text-gray-900 font-semibold">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {profileData.joiningDate ? new Date(profileData.joiningDate).toLocaleDateString('en-GB') : 'N/A'}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Work Location</p>
                  <p className="text-gray-900 font-semibold">Headquarters</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Name</p>
                  <p className="text-gray-900 font-semibold">{profileData.emergencyContact?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Relationship</p>
                  <p className="text-gray-900 font-semibold">{profileData.emergencyContact?.relationship || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Phone Number</p>
                  <p className="text-gray-900 font-semibold">{profileData.emergencyContact?.phone || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
