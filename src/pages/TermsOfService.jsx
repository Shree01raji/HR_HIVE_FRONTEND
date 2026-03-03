import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function TermsOfService() {
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
              Terms of Service
            </h1>
            <p className="text-gray-600 font-medium mb-8">
              Last Updated: January 2025
            </p>

            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">By accessing and using HR-Hive ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed">HR-Hive is a human resources management platform that provides tools for employee management, payroll, timesheet tracking, recruitment, and related HR functions.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">3. User Accounts</h2>
              <p className="text-gray-700 leading-relaxed">To access certain features of the Service, you must register for an account. You agree to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">4. Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Transmit any harmful code, viruses, or malicious software</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service to harass, abuse, or harm others</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">5. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">The Service and its original content, features, and functionality are owned by HR-Hive and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">6. User Content</h2>
              <p className="text-gray-700 leading-relaxed">You retain ownership of any content you submit to the Service. By submitting content, you grant us a license to use, modify, and display such content as necessary to provide the Service.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">7. Privacy</h2>
              <p className="text-gray-700 leading-relaxed">Your use of the Service is also governed by our Privacy Policy. Please review our <Link to="/privacy-policy.html" className="text-[#1e3a5f] hover:underline">Privacy Policy</Link> to understand our practices regarding the collection and use of your information.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">8. Service Availability</h2>
              <p className="text-gray-700 leading-relaxed">We strive to provide reliable service but do not guarantee that the Service will be available at all times. We reserve the right to modify, suspend, or discontinue the Service at any time.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">9. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">To the maximum extent permitted by law, HR-Hive shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">10. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">You agree to indemnify and hold harmless HR-Hive from any claims, damages, losses, liabilities, and expenses arising out of your use of the Service or violation of these Terms.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">11. Termination</h2>
              <p className="text-gray-700 leading-relaxed">We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms of Service.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">12. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">We reserve the right to modify these Terms of Service at any time. We will notify users of any material changes by posting the updated terms on this page and updating the "Last Updated" date.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">13. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4 text-[#1e3a5f]">14. Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-6 mt-6 border border-gray-200">
                <p className="text-gray-700 mb-2">If you have any questions about these Terms of Service, please contact us:</p>
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
