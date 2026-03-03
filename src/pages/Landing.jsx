import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiUsers, FiBriefcase, FiClock, FiMessageCircle, FiTrendingUp, 
  FiShield, FiCheckCircle, FiPlay, FiArrowRight, FiX, FiStar,
  FiAward, FiZap, FiLock, FiGlobe, FiBarChart
} from 'react-icons/fi';
import Logo from '../components/Logo';
import HoneycombBackground from '../components/HoneycombBackground';
import PaymentModal from '../components/PaymentModal';
import EnquiryForm from '../components/EnquiryForm';

const Landing = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = () => {
    setShowDemo(true);
    setShowInstructions(true);
  };

  const handleStartDemo = () => {
    setShowInstructions(false);
  };

  const features = [
    {
      icon: <FiBriefcase className="w-8 h-8" />,
      title: 'Smart Recruitment',
      description: 'AI-powered candidate screening, automated resume parsing, and multi-round interview scheduling with Zoom integration.'
    },
    {
      icon: <FiUsers className="w-8 h-8" />,
      title: 'Employee Management',
      description: 'Complete employee lifecycle management from onboarding to offboarding with real-time analytics.'
    },
    {
      icon: <FiMessageCircle className="w-8 h-8" />,
      title: 'AI HR Assistant',
      description: '24/7 intelligent chatbot that answers questions and assists with HR processes instantly.'
    },
    {
      icon: <FiClock className="w-8 h-8" />,
      title: 'Leave & Attendance',
      description: 'Automated leave approvals, timesheet tracking, and attendance management with notifications.'
    },
    {
      icon: <FiTrendingUp className="w-8 h-8" />,
      title: 'Performance Analytics',
      description: 'Comprehensive analytics and reporting for data-driven HR decisions and insights.'
    },
    {
      icon: <FiShield className="w-8 h-8" />,
      title: 'Compliance & Security',
      description: 'Built-in compliance features and enterprise-grade security with data encryption.'
    }
  ];

  const benefits = [
    { icon: <FiZap className="w-6 h-6" />, text: '99.9% Uptime' },
    { icon: <FiLock className="w-6 h-6" />, text: 'Enterprise Security' },
    { icon: <FiGlobe className="w-6 h-6" />, text: '24/7 Support' },
    { icon: <FiBarChart className="w-6 h-6" />, text: 'Real-time Analytics' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'HR Director',
      company: 'Tech Corp',
      rating: 5,
      text: 'HR-Hive has transformed our recruitment process. The AI screening saves us 10+ hours per week.'
    },
    {
      name: 'Michael Chen',
      role: 'Operations Manager',
      company: 'Global Solutions',
      rating: 5,
      text: 'The employee management features are intuitive and powerful. Our team onboarding is now 50% faster.'
    },
    {
      name: 'Emily Rodriguez',
      role: 'VP of People',
      company: 'StartupXYZ',
      rating: 5,
      text: 'Best investment we made this year. The analytics help us make data-driven decisions every day.'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500+', label: 'Companies' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' }
  ];

  const demoSteps = [
    {
      title: 'Step 1: Authentication',
      description: 'Users can register or login based on their role (Admin, Employee, or Candidate) with secure authentication.'
    },
    {
      title: 'Step 2: Organization Selection',
      description: 'After login, users enter their company code (organization name) to access their organization\'s dedicated database environment.'
    },
    {
      title: 'Step 3: Role-Based Dashboard',
      description: 'Each user sees a customized dashboard tailored to their role and permissions with real-time updates from their organization\'s isolated database.'
    },
    {
      title: 'Step 4: Core Features',
      description: 'Access features like recruitment, leave management, payroll, learning, and performance tracking within your organization\'s secure environment.'
    },
    {
      title: 'Step 5: AI Assistant',
      description: 'Chat with the HR AI assistant for instant help, information, and process guidance powered by multi-tenant architecture.'
    },
    {
      title: 'Step 6: Real-time Updates',
      description: 'Get instant notifications for approvals, interviews, and important updates across all devices with complete data isolation.'
    }
  ];

  const userRoles = [
    {
      name: 'Admin/HR Manager',
      icon: <FiShield className="w-8 h-8" />,
      color: 'bg-purple-100 text-purple-600',
      features: [
        'Full system access and control',
        'Employee management and analytics',
        'Recruitment workflow approval',
        'Payroll and leave management',
        'Performance tracking',
        'Compliance reporting'
      ]
    },
    {
      name: 'Employee',
      icon: <FiUsers className="w-8 h-8" />,
      color: 'bg-blue-100 text-blue-600',
      features: [
        'Apply for leaves and track status',
        'View payroll and timesheets',
        'Access learning resources',
        'Chat with HR assistant',
        'Performance reviews',
        'Document management'
      ]
    },
    {
      name: 'Candidate',
      icon: <FiBriefcase className="w-8 h-8" />,
      color: 'bg-purple-100 text-purple-600',
      features: [
        'Browse and apply for jobs',
        'Track application status',
        'View interview details',
        'Chat with Career Assistant',
        'Profile management',
        'Receive interview notifications'
      ]
    }
  ];

  const plans = [
    {
      name: 'Free',
      description: 'Free plan with basic features.',
      monthlyPrice: '₹0',
      yearlyPrice: '₹0',
      features: ['attendance', 'basic_payroll'],
      headerColor: 'bg-gray-800',
      popular: false,
      planId: 1 // This should match your database plan IDs
    },
    {
      name: 'Basic',
      description: 'Basic plan with essential features.',
      monthlyPrice: '₹500',
      yearlyPrice: '₹6000',
      features: ['attendance', 'payroll', 'documents', 'recruitment', 'Employee Management'],
      headerColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
      popular: false,
      planId: 2
    },
    {
      name: 'Pro',
      description: 'Professional plan with advanced features.',
      monthlyPrice: '₹1000',
      yearlyPrice: '₹12000',
      features: ['attendance', 'payroll', 'documents', 'recruitment', 'learning', 'analytics'],
      headerColor: 'bg-gradient-to-r from-purple-500 to-purple-600',
      popular: true,
      planId: 3
    },
    {
      name: 'Enterprise',
      description: 'Enterprise plan with all features.',
      monthlyPrice: '₹2500',
      yearlyPrice: '₹30000',
      features: ['attendance', 'payroll', 'documents', 'recruitment', 'learning', 'analytics', 'advanced_analytics', 'custom_integrations', 'priority_support'],
      headerColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
      popular: false,
      planId: 4
    }
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    if (plan.name === 'Free') {
      // Free plan - directly go to registration
      localStorage.setItem('selectedPlan', JSON.stringify(plan));
      navigate('/register');
    } else if (plan.name === 'Enterprise') {
      // Enterprise plan - scroll to contact section
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Paid plan (Basic, Pro) - show payment modal
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = (paymentData) => {
    setShowPaymentModal(false);
    // Navigate to registration with plan info
    navigate('/register');
  };

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
              <Logo size="sm" showTagline={false} className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">Features</a>
                <a href="#pricing" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">Pricing</a>
                <a href="#benefits" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">Benefits</a>
                <a href="#testimonials" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">Testimonials</a>
                <a href="#contact" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">Contact</a>
                <a href="/privacy-policy.html" className="text-gray-700 hover:text-[#1e3a5f] font-medium transition-all duration-200">Privacy Policy</a>
                <Link to="/login" className="bg-[#1e3a5f] text-white px-6 py-2 rounded-lg hover:bg-[#2a4a6f] transition-colors font-medium">
                  Login
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 py-20 sm:py-24 lg:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-5xl mx-auto">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-[#1e3a5f] animate-slide-down">
                Where People Strategy Meets Intelligent Automation
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Transform your business with cutting-edge AI, machine learning, and data analytics. Multi-tenant HR management system that learns, adapts, and evolves with your organization's needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <Link
                  to="/register"
                  className="px-8 py-4 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a6f] transition-all transform hover:scale-105 hover:shadow-xl font-semibold text-lg flex items-center justify-center shadow-md"
                >
                  Get Started Free
                </Link>
                <button
                  onClick={handleLogoClick}
                  className="px-8 py-4 bg-white text-[#1e3a5f] rounded-lg border-2 border-[#1e3a5f] hover:bg-gray-50 transition-all transform hover:scale-105 hover:shadow-xl font-semibold text-lg flex items-center justify-center"
                >
                  <FiPlay className="mr-2" />
                  Watch Demo
                </button>
              </div>
              
              {/* Tagline */}
              <p className="text-gray-600 text-sm font-medium mb-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>Empowering People • Elevating Technology • Enabling Intelligence</p>
              
              {/* Privacy Policy Link - Prominently displayed for Google verification */}
              <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                <a 
                  href="/privacy-policy.html" 
                  className="text-sm text-gray-600 hover:text-[#1e3a5f] underline transition-colors"
                  target="_self"
                >
                  Privacy Policy
                </a>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-gray-700 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 hover:scale-110 transition-transform duration-200">
                    <div className="text-[#1e3a5f]">{benefit.icon}</div>
                    <span className="font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative z-10 py-12 bg-white border-y border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, index) => (
                <div key={index} className="animate-slide-up hover:scale-110 transition-transform duration-300" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="text-3xl md:text-4xl font-bold text-[#1e3a5f] mb-2">{stat.value}</div>
                  <div className="text-sm md:text-base text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Usage Transparency Section - Required for Google OAuth Verification */}
        <section className="relative z-10 py-12 bg-[#e8f0f5] border-y border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Data Usage & Privacy</h2>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  HR-Hive is committed to transparency about how we use your data. We request access to certain information to provide you with essential HR management services:
                </p>
                <ul className="space-y-3 text-gray-700 mb-6">
                  <li className="flex items-start">
                    <FiCheckCircle className="text-[#1e3a5f] mr-3 mt-1 flex-shrink-0" />
                    <span><strong>Profile Information:</strong> To create and manage your employee profile, including name, email, and role within your organization.</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheckCircle className="text-[#1e3a5f] mr-3 mt-1 flex-shrink-0" />
                    <span><strong>Calendar Access:</strong> To schedule interviews, meetings, and manage leave requests efficiently (optional, with your consent).</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheckCircle className="text-[#1e3a5f] mr-3 mt-1 flex-shrink-0" />
                    <span><strong>Email Access:</strong> To send important notifications, leave approvals, and recruitment updates (optional, with your consent).</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheckCircle className="text-[#1e3a5f] mr-3 mt-1 flex-shrink-0" />
                    <span><strong>Work Activity Data:</strong> To track timesheets, attendance, and productivity metrics for accurate payroll and performance management.</span>
                  </li>
                </ul>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  All data is stored securely in isolated, organization-specific databases. We never share your data with third parties without your explicit consent. You have full control over your data and can request access, modification, or deletion at any time.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  For complete details about our data practices, please review our <a href="/privacy-policy.html" className="text-[#1e3a5f] hover:underline font-medium">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative z-10 py-20 sm:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-down">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Powerful Features</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Everything you need to manage your workforce efficiently and scale your HR operations with multi-tenant architecture</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#1e3a5f] hover:shadow-xl transition-all hover:-translate-y-2 group animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-[#1e3a5f] mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="relative z-10 py-20 sm:py-24 bg-[#e8f0f5]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-down">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Choose Your Plan</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Flexible pricing plans designed to scale with your organization's needs</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-xl animate-slide-up ${
                    plan.popular 
                      ? 'border-yellow-400 shadow-lg scale-105' 
                      : 'border-gray-200 hover:border-[#1e3a5f]'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`${plan.popular ? 'bg-yellow-400' : 'bg-[#1e3a5f]'} p-4 text-white`}>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-white/90 mt-1">{plan.description}</p>
                  </div>
                  <div className="p-6">
                    {plan.name !== 'Enterprise' && (
                      <div className="mb-4">
                        <div className="text-3xl font-bold text-gray-900 mb-1">{plan.monthlyPrice}<span className="text-lg font-normal text-gray-500">/mo</span></div>
                        {plan.yearlyPrice !== '₹0' && (
                          <div className="text-lg text-gray-600">{plan.yearlyPrice}<span className="text-sm">/yr</span></div>
                        )}
                      </div>
                    )}
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                          <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-1 flex-shrink-0" />
                          <span className="text-gray-600 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handlePlanSelect(plan)}
                      className={`block w-full text-center px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                        plan.popular
                          ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 hover:shadow-lg'
                          : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f] hover:shadow-lg'
                      }`}
                    >
                      {plan.name === 'Free' 
                        ? 'Get Started' 
                        : plan.name === 'Enterprise' 
                        ? 'Contact to Enquiry!' 
                        : 'View Plan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* User Roles Section */}
        <section id="benefits" className="relative z-10 py-20 sm:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-down">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Multi-Tenant Architecture</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Secure, isolated databases per organization. Each company gets its own dedicated environment with complete data privacy and customization.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {userRoles.map((role, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#1e3a5f] hover:shadow-xl transition-all hover:-translate-y-2 animate-slide-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="bg-[#1e3a5f]/10 rounded-xl p-4 w-fit mb-6 border border-[#1e3a5f]/20">
                    <div className="text-[#1e3a5f]">{role.icon}</div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{role.name}</h3>
                  <ul className="space-y-3">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                        <FiCheckCircle className="text-[#1e3a5f] mr-3 mt-1 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="relative z-10 py-20 sm:py-24 bg-[#e8f0f5]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-down">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Trusted by Industry Leaders</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">See what our customers say about HR-Hive</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#1e3a5f] hover:shadow-lg transition-all hover:-translate-y-2 animate-slide-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FiStar key={i} className="text-yellow-400 fill-current w-5 h-5" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed italic">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact/Enquiry Section */}
        <section id="contact" className="relative z-10 py-20 sm:py-24 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 animate-slide-down">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Get in Touch</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">Have questions? Send us an enquiry and we'll get back to you soon!</p>
            </div>
            <div className="max-w-3xl mx-auto">
              <EnquiryForm />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 py-20 sm:py-24 bg-[#1e3a5f]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 animate-slide-down">Ready to Transform Your HR?</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>Join thousands of organizations already using HR-Hive's multi-tenant architecture to streamline their HR operations</p>
            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-lg shadow-lg animate-slide-up"
              style={{ animationDelay: '0.4s' }}
            >
              Get Started Now - Free Trial
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 bg-[#1e3a5f] text-white py-12 border-t border-[#2a4a6f]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="animate-fade-in">
                <div className="mb-4">
                  <Logo size="md" showTagline={true} dark={true} />
                </div>
                <p className="text-gray-300 text-sm">Neural Intelligence Solutions - Next Generation AI-Powered HR Management System with Multi-Tenant Architecture.</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h4 className="font-semibold mb-4 text-white">Product</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li><a href="#features" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Features</a></li>
                  <li><a href="#pricing" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Pricing</a></li>
                  <li><a href="#benefits" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Multi-Tenancy</a></li>
                  <li><a href="#testimonials" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Testimonials</a></li>
                </ul>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h4 className="font-semibold mb-4 text-white">Company</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li><Link to="/login" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Login</Link></li>
                  <li><Link to="/register" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Get Started</Link></li>
                  <li><a href="#contact" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Contact Us</a></li>
                </ul>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <h4 className="font-semibold mb-4 text-white">Support</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li><a href="#" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Documentation</a></li>
                  <li><a href="#contact" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Enquiry</a></li>
                  <li><a href="/privacy-policy.html" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Privacy Policy</a></li>
                  <li><a href="/terms-of-service.html" className="hover:text-yellow-400 transition-all duration-200 hover:translate-x-1 inline-block">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-[#2a4a6f] pt-8 text-center text-sm text-gray-300">
              <p className="mb-4">© 2025 HR-Hive. Neural Intelligence Solutions - Empowering People • Elevating Technology • Enabling Intelligence</p>
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <a href="/privacy-policy.html" className="hover:text-yellow-400 transition-colors">Privacy Policy</a>
                <span className="text-gray-500">•</span>
                <a href="/terms-of-service.html" className="hover:text-yellow-400 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>

        {/* Demo Modal */}
        {showDemo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowDemo(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
              {showInstructions ? (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#1e3a5f]">Demo Instructions</h2>
                    <button
                      onClick={() => setShowDemo(false)}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">User Roles</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      {userRoles.map((role, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-lg p-4 hover:scale-105 transition-transform duration-200 hover:border-[#1e3a5f]">
                          <div className="bg-[#1e3a5f]/10 rounded-lg p-3 w-fit mb-3">
                            <div className="text-[#1e3a5f]">{role.icon}</div>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-2">{role.name}</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {role.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx} className="flex items-start">
                                <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h3>
                    <div className="space-y-4">
                      {demoSteps.map((step, index) => (
                        <div key={index} className="flex items-start p-4 rounded-lg border-l-4 bg-[#1e3a5f]/5 border-[#1e3a5f] hover:scale-105 transition-transform duration-200">
                          <div className="bg-[#1e3a5f] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
                            <p className="text-gray-600">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => setShowDemo(false)}
                      className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleStartDemo}
                      className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a6f] hover:shadow-lg transition-all transform hover:scale-105 font-medium flex items-center"
                    >
                      Look Demo!!
                      <FiArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#1e3a5f]">Live Demo</h2>
                    <button
                      onClick={() => setShowDemo(false)}
                      className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Close modal"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="bg-[#e8f0f5] rounded-lg p-8 mb-6">
                    <div className="bg-white rounded p-4 mb-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600 text-sm ml-4">HR-Hive Dashboard</span>
                      </div>
                      <div className="bg-[#e8f0f5] rounded p-6 min-h-[400px]">
                        <div className="text-center py-20">
                          <div className="mx-auto mb-6 flex items-center justify-center">
                            <Logo size="lg" showTagline={false} />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">HR-Hive Demo</h3>
                          <p className="text-gray-600 mb-6">Experience the full power of AI-driven HR management</p>
                          <div className="flex flex-wrap justify-center gap-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[200px] shadow-sm">
                              <FiBriefcase className="w-8 h-8 text-[#1e3a5f] mx-auto mb-2" />
                              <p className="text-gray-900 font-semibold">Recruitment</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[200px] shadow-sm">
                              <FiUsers className="w-8 h-8 text-[#1e3a5f] mx-auto mb-2" />
                              <p className="text-gray-900 font-semibold">Employees</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-[200px] shadow-sm">
                              <FiMessageCircle className="w-8 h-8 text-[#1e3a5f] mx-auto mb-2" />
                              <p className="text-gray-900 font-semibold">AI Assistant</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 rounded-lg p-6 mb-6">
                    <h4 className="font-semibold text-[#1e3a5f] mb-2">🎯 Key Highlights</h4>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-0.5 flex-shrink-0" />
                        <span>AI-powered resume scanning and candidate matching</span>
                      </li>
                      <li className="flex items-start">
                        <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-0.5 flex-shrink-0" />
                        <span>Automated interview scheduling with Zoom integration</span>
                      </li>
                      <li className="flex items-start">
                        <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-0.5 flex-shrink-0" />
                        <span>Multi-round approval workflows</span>
                      </li>
                      <li className="flex items-start">
                        <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-0.5 flex-shrink-0" />
                        <span>Real-time notifications and updates</span>
                      </li>
                      <li className="flex items-start">
                        <FiCheckCircle className="text-[#1e3a5f] mr-2 mt-0.5 flex-shrink-0" />
                        <span>Comprehensive analytics and reporting</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      to="/register"
                      className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4a6f] hover:shadow-lg transition-all transform hover:scale-105 font-medium"
                    >
                      Try It Now - Free Trial
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          plan={selectedPlan}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
  );
};

export default Landing;
