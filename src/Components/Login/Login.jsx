"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
// import toast from 'react-hot-toast'; // Uncomment if using react-hot-toast

const Login = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password) {
      setError('Both fields are required.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/login-admin`,
        {
          userName: name,
          password: password
        }
      );

      // Debug: log the response from the server
      // console.log("Response from server:", res);

      // Check if token exists in response
      if (res.data && res.data.token) {
        localStorage.setItem('userToken', res.data.token);

        // Uncomment if using toast
        // toast.success("Login successful!");

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setError(res.data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err.response ? err.response.data : err);
      setError(
        err?.response?.data?.message ||
        "Login failed. Please check your credentials."
      );
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen select-none bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Centered content */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-md shadow-2xl max-w-md w-full transform transition-all duration-300 hover:scale-105">
          {/* Logo section */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-3 rounded-md inline-block mb-4">
              <img
              src="/Logo.png"
              alt="Skill KING"
              draggable="false"
              className="w-[140px] lg:w-[180px] h-auto "
            />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-300 text-lg">Sign in to your User dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm text-white mb-2">Your Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-300 outline-none rounded-md focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-white mb-2">Your Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-300 outline-none rounded-md focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                placeholder="Enter your password"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex w-full">
              <button
                type="submit"
                className={`px-6 py-3 w-full cursor-pointer border-b-5 border-blue-900/40 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl ${loading ? 'opacity-60 pointer-events-none' : ''}`}
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default Login;
