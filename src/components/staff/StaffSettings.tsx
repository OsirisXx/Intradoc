import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { API_URL } from '../../services/apiClient';
import './StaffSettings.css';

interface UserProfile {
  USER_ID: number;
  NAME: string;
  ID_NUMBER: string;
  EMAIL: string;
  FUNCTIONAL_ROLE: string;
  ORGANIZATIONAL_ROLE: string;
  SECTION_ID: number;
  SECTION_NAME: string;
  DIVISION_NAME: string;
  STATUS: string;
  PROFILE_IMAGE?: string;
  CREATED_AT: string;
}

export function StaffSettings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getCurrentUserProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setProfileForm({
          name: response.data.NAME,
          email: response.data.EMAIL
        });
        if (response.data.PROFILE_IMAGE) {
          const base = API_URL.replace(/\/api$/, '');
          const url = response.data.PROFILE_IMAGE.startsWith('http')
            ? response.data.PROFILE_IMAGE
            : `${base}${response.data.PROFILE_IMAGE}`;
          setImagePreview(url);
        }
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to fetch profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await apiService.updateUserProfile(profileForm);
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        // Update the user context with new data
        if (user) {
          updateUser({
            ...user,
            NAME: profileForm.name,
            EMAIL: profileForm.email
          });
        }
        fetchProfile(); // Refresh profile data
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setIsUpdating(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      setIsUpdating(false);
      return;
    }

    try {
      const response = await apiService.updateUserPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      if (response.success) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, GIF, WebP)' });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await apiService.uploadProfileImage(selectedImage);
      if (response.success && response.data) {
        setMessage({ type: 'success', text: 'Profile image uploaded successfully' });
        setSelectedImage(null);
        // Update the user context with new image
        if (user) {
          updateUser({
            ...user,
            PROFILE_IMAGE: response.data.imagePath
          });
        }
        fetchProfile(); // Refresh profile data
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to upload image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setIsUpdating(false);
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(profile?.PROFILE_IMAGE || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        <div className="error-state">
          <p>Failed to load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-content">
        {/* Profile Image Section */}
        <div className="settings-section">
          <h2>Profile Picture</h2>
          <div className="profile-image-section">
            <div className="profile-image-container">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Profile" 
                  className="profile-image"
                />
              ) : (
                <div className="profile-image-placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="profile-image-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
              >
                Choose Image
              </button>
              {selectedImage && (
                <>
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={isUpdating}
                    className="btn btn-primary"
                  >
                    {isUpdating ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={clearImageSelection}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="settings-section">
          <h2>Personal Information</h2>
          <form onSubmit={handleProfileUpdate} className="settings-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="idNumber">ID Number</label>
              <input
                type="text"
                id="idNumber"
                value={profile.ID_NUMBER}
                disabled
                className="disabled"
              />
              <small className="form-help">ID Number cannot be changed</small>
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn btn-primary"
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Organizational Details Section */}
        <div className="settings-section">
          <h2>Organizational Details</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Functional Role</label>
              <span>{profile.FUNCTIONAL_ROLE.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="info-item">
              <label>Organizational Assignment</label>
              <span>{profile.ORGANIZATIONAL_ROLE}</span>
            </div>
            <div className="info-item">
              <label>Section</label>
              <span>{profile.SECTION_NAME}</span>
            </div>
            <div className="info-item">
              <label>Division</label>
              <span>{profile.DIVISION_NAME}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status ${profile.STATUS}`}>
                {profile.STATUS.toUpperCase()}
              </span>
            </div>
            <div className="info-item">
              <label>Member Since</label>
              <span>{new Date(profile.CREATED_AT).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Security Settings Section */}
        <div className="settings-section">
          <h2>Security Settings</h2>
          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
              <small className="form-help">Password must be at least 6 characters long</small>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn btn-primary"
            >
              {isUpdating ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
