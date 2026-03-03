import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function PrivacyPolicy() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#e8f0f5] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e3a5f]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' : 'bg-white/90 backdrop-blur-sm'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" showTagline={false} className="cursor-pointer" />
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">
                Home
              </Link>
              <Link to="/login" className="bg-[#1e3a5f] text-white px-6 py-2 rounded-lg hover:bg-[#2a4a6f] transition-colors font-medium">
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 sm:p-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#1e3a5f]">
              Privacy Policy
            </h1>
            <p className="text-gray-600 font-medium mb-8">
              Last Updated: January 2025
            </p>

            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">HR-Hive ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our HR management platform.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Personal identification information (name, email address, phone number)</li>
                <li>Employment information (job title, department, employee ID)</li>
                <li>Authentication credentials (for account access)</li>
                <li>Usage data and analytics</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process and manage employee records</li>
                <li>Send administrative information and updates</li>
                <li>Respond to your inquiries and requests</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">4. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">5. Data Sharing</h2>
              <p className="text-gray-700 leading-relaxed">We do not sell, trade, or rent your personal information to third parties. We may share information only:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>With service providers who assist in operating our platform</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">6. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">7. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed">We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">8. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed">Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties.</p>
              <p className="text-gray-700 leading-relaxed mt-2">Your use of the Service is also governed by our <Link to="/terms-of-service.html" className="text-[#1e3a5f] hover:underline font-medium">Terms of Service</Link>. Please review our Terms of Service to understand the rules and regulations for using our platform.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">9. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">10. Contact Us</h2>
              <div className="bg-gray-50 rounded-lg p-6 mt-6 border border-gray-200">
                <p className="text-gray-700 mb-2">If you have any questions about this Privacy Policy, please contact us:</p>
                <p className="text-gray-700">
                  <strong className="text-[#1e3a5f]">Email:</strong> <a href="mailto:hr.klareit@gmail.com" className="text-[#1e3a5f] hover:underline">hr.klareit@gmail.com</a><br />
                  <strong className="text-[#1e3a5f]">Website:</strong> <a href="https://hive.klareit.com" className="text-[#1e3a5f] hover:underline">https://hive.klareit.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
