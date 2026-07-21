import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Image as ImageIcon, Camera, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Settings() {
  const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo') || '{}'));
  
  // Password State
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passMessage, setPassMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Profile Image State
  const [profileImage, setProfileImage] = useState(userInfo.profileImage || '');
  const [uploadMessage, setUploadMessage] = useState('');


  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassMessage('New passwords do not match');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/update-password/${userInfo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new })
      });
      const data = await res.json();
      if (res.ok) {
        setPassMessage('Password updated successfully!');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        setPassMessage(data.message || 'Error updating password');
      }
    } catch (err) {
      setPassMessage('Network error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/update-profile/${userInfo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImage: '' })
      });
      if (res.ok) {
        setProfileImage('');
        setUploadMessage('Profile image removed!');
        const updatedUser = { ...userInfo, profileImage: '' };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        setUserInfo(updatedUser);
        window.dispatchEvent(new Event('profileImageUpdated'));
      } else {
        setUploadMessage('Failed to remove image.');
      }
    } catch (err) {
      setUploadMessage('Network error occurred');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setProfileImage(objectUrl);
      
      const formData = new FormData();
      formData.append('profileImage', file);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/update-profile/${userInfo._id}`, {
          method: 'PUT',
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          setUploadMessage('Profile image updated!');
          // Update local storage so other components can see it
          const updatedUser = { ...userInfo, profileImage: data.profileImage };
          localStorage.setItem('userInfo', JSON.stringify(updatedUser));
          setUserInfo(updatedUser);
          setProfileImage(data.profileImage);
          // Dispatch a custom event to notify other components (like sidebar)
          window.dispatchEvent(new Event('profileImageUpdated'));
        } else {
          setUploadMessage('Failed to save image.');
        }
      } catch (err) {
        setUploadMessage('Network error occurred');
      }
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('blob:')) return url; // local preview
    if (url.startsWith('/')) return `${import.meta.env.VITE_API_URL}${url}`;
    return url;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and security.</p>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">

        {/* Profile Image Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-lg"><ImageIcon className="w-5 h-5 mr-2 text-primary" /> Profile Picture</CardTitle>
            <CardDescription>Update your avatar for your profile.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative group w-32 h-32 mb-6">
              <img 
                src={getImageUrl(profileImage) || `https://api.dicebear.com/7.x/notionists/svg?seed=${userInfo.name?.replace(' ', '')}&backgroundColor=f3f4f6`}
                alt="Profile" 
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-md dark:border-gray-800"
              />
              <label htmlFor="imageUpload" className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <Camera className="w-8 h-8" />
              </label>
              <input 
                id="imageUpload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </div>
            {profileImage && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 mb-2"
                onClick={handleRemoveImage}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Remove Image
              </Button>
            )}
            {uploadMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{uploadMessage}</p>}
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-lg"><Lock className="w-5 h-5 mr-2 text-primary" /> Change Password</CardTitle>
            <CardDescription>Ensure your account is using a secure password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input 
                    type={showCurrent ? "text" : "password"} 
                    required
                    className="pr-10"
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrent(!showCurrent)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input 
                    type={showNew ? "text" : "password"} 
                    required
                    className="pr-10"
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNew(!showNew)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    type={showConfirm ? "text" : "password"} 
                    required
                    className="pr-10"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(!showConfirm)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              {passMessage && (
                <p className={`text-sm ${passMessage.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {passMessage}
                </p>
              )}
              
              <Button type="submit" className="w-full" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
