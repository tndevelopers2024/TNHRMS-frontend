import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Image as ImageIcon, Camera, Trash2, Eye, EyeOff, Loader2, X } from "lucide-react";
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

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

  // Image Crop State
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

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
        method: 'POST',
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImageToCrop(objectUrl);
      setIsCropperOpen(true);
    }
    e.target.value = '';
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        0
      );
      
      const objectUrl = URL.createObjectURL(croppedImageBlob);
      setProfileImage(objectUrl);
      setIsCropperOpen(false);
      setImageToCrop(null);
      
      const formData = new FormData();
      formData.append('profileImage', croppedImageBlob, 'profile.jpg');

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/update-profile/${userInfo._id}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage('Profile image updated!');
        const updatedUser = { ...userInfo, profileImage: data.profileImage };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        setUserInfo(updatedUser);
        setProfileImage(data.profileImage);
        window.dispatchEvent(new Event('profileImageUpdated'));
      } else {
        setUploadMessage('Failed to save image.');
      }
    } catch (e) {
      console.error(e);
      setUploadMessage('Error cropping or uploading image.');
    }
  };

  const handleCropCancel = () => {
    setIsCropperOpen(false);
    setImageToCrop(null);
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

      {isCropperOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Crop Profile Picture</h3>
              <button onClick={handleCropCancel} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[300px] bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleCropCancel}>Cancel</Button>
                <Button onClick={handleCropSave}>Save Image</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
