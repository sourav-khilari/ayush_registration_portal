import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  FaLeaf, 
  FaUserMd, 
  FaChartLine, 
  FaShieldAlt, 
  FaRocket, 
  FaUsers,
  FaArrowRight,
  FaCheckCircle,
  FaStar,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt
} from 'react-icons/fa'

function LandingPage() {
  const navigate = useNavigate()
  const { token, user } = useAuth()

  const handleStartRegistration = () => {
    if (token && user?.role === 'startup_owner') {
      navigate('/StartupOwner/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ayush-50 to-green-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#home" className="text-gray-700 hover:text-ayush-600 transition-colors">Home</a>
              <a href="#about" className="text-gray-700 hover:text-ayush-600 transition-colors">About</a>
              <a href="#services" className="text-gray-700 hover:text-ayush-600 transition-colors">Services</a>
              <a href="#contact" className="text-gray-700 hover:text-ayush-600 transition-colors">Contact</a>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/signup" className="px-4 py-2 border border-ayush-600 text-ayush-600 rounded hover:bg-ayush-50 transition-colors">Sign Up</Link>
              <Link to="/login" className="px-4 py-2 border border-ayush-600 text-ayush-600 rounded hover:bg-ayush-50 transition-colors">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/ayush_banner.jpeg" 
            alt="AYUSH Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-ayush-600">AYUSH</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Empowering startups in Ayurveda, Yoga, Unani, Siddha, and Homeopathy. 
              Register your innovative healthcare startup and join India's traditional medicine revolution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleStartRegistration} className="btn-primary text-lg px-8 py-4 inline-block">
                Start Registration <FaArrowRight className="inline ml-2" />
              </button>
              <button className="btn-secondary text-lg px-8 py-4">
                Learn More
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="animate-bounce">
            <FaArrowRight className="text-white text-2xl rotate-90" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose AYUSH Portal?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive support for traditional medicine startups with modern technology
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-lg bg-ayush-50 hover:bg-ayush-100 transition-colors">
              <FaUserMd className="text-4xl text-ayush-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Guidance</h3>
              <p className="text-gray-600">Get mentorship from industry experts in traditional medicine</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-ayush-50 hover:bg-ayush-100 transition-colors">
              <FaChartLine className="text-4xl text-ayush-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Growth Tracking</h3>
              <p className="text-gray-600">Monitor your startup's progress with detailed analytics</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-ayush-50 hover:bg-ayush-100 transition-colors">
              <FaShieldAlt className="text-4xl text-ayush-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Platform</h3>
              <p className="text-gray-600">Your data is protected with enterprise-grade security</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-ayush-50 hover:bg-ayush-100 transition-colors">
              <FaRocket className="text-4xl text-ayush-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Processing</h3>
              <p className="text-gray-600">Quick registration and approval process</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                About AYUSH Startup Portal
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                The AYUSH Startup Registration Portal is a comprehensive platform designed to support 
                and nurture startups in the field of traditional Indian medicine systems including 
                Ayurveda, Yoga, Unani, Siddha, and Homeopathy.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <FaCheckCircle className="text-ayush-600 mr-3" />
                  <span className="text-gray-700">Streamlined registration process</span>
                </div>
                <div className="flex items-center">
                  <FaCheckCircle className="text-ayush-600 mr-3" />
                  <span className="text-gray-700">Access to funding opportunities</span>
                </div>
                <div className="flex items-center">
                  <FaCheckCircle className="text-ayush-600 mr-3" />
                  <span className="text-gray-700">Networking with industry leaders</span>
                </div>
                <div className="flex items-center">
                  <FaCheckCircle className="text-ayush-600 mr-3" />
                  <span className="text-gray-700">Compliance and regulatory support</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="text-center">
                  <FaUsers className="text-6xl text-ayush-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Join 1000+ Startups</h3>
                  <p className="text-gray-600 mb-6">
                    Already registered and growing in the AYUSH ecosystem
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-ayush-600">500+</div>
                      <div className="text-sm text-gray-600">Active Startups</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-ayush-600">₹50Cr+</div>
                      <div className="text-sm text-gray-600">Funding Raised</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* AYUSH Banner Image as decorative element */}
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white">
                <img 
                  src="/ayush_banner.jpeg" 
                  alt="AYUSH" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive support for your AYUSH startup journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-ayush-50 to-green-50 p-8 rounded-lg">
              <FaRocket className="text-3xl text-ayush-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Startup Registration</h3>
              <p className="text-gray-600 mb-4">
                Complete registration process with step-by-step guidance and document verification.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Business plan review</li>
                <li>• Legal compliance check</li>
                <li>• Document verification</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-ayush-50 to-green-50 p-8 rounded-lg">
              <FaChartLine className="text-3xl text-ayush-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Growth Analytics</h3>
              <p className="text-gray-600 mb-4">
                Track your startup's performance with detailed analytics and insights.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Performance metrics</li>
                <li>• Market analysis</li>
                <li>• Growth recommendations</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-ayush-50 to-green-50 p-8 rounded-lg">
              <FaUsers className="text-3xl text-ayush-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Community Support</h3>
              <p className="text-gray-600 mb-4">
                Connect with fellow entrepreneurs and industry experts in the AYUSH ecosystem.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Networking events</li>
                <li>• Mentorship programs</li>
                <li>• Peer learning</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Startups Say
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "The AYUSH portal made our registration process so smooth. The guidance and support 
                we received was exceptional."
              </p>
              <div className="font-semibold text-gray-900">Dr. Priya Sharma</div>
              <div className="text-sm text-gray-500">Ayurveda Wellness Startup</div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "Excellent platform for traditional medicine startups. The networking opportunities 
                have been invaluable for our growth."
              </p>
              <div className="font-semibold text-gray-900">Rajesh Kumar</div>
              <div className="text-sm text-gray-500">Yoga Tech Solutions</div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                "The analytics and tracking features help us understand our progress and make 
                data-driven decisions."
              </p>
              <div className="font-semibold text-gray-900">Dr. Anjali Patel</div>
              <div className="text-sm text-gray-500">Homeopathy Innovations</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-ayush-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your AYUSH Journey?
          </h2>
          <p className="text-xl text-ayush-100 mb-8 max-w-2xl mx-auto">
            Join thousands of entrepreneurs building the future of traditional medicine in India.
          </p>
          <button onClick={handleStartRegistration} className="bg-white text-ayush-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg text-lg transition-colors duration-200 inline-block">
            Register Your Startup Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FaLeaf className="text-ayush-400 text-2xl" />
                <span className="text-xl font-bold">AYUSH</span>
              </div>
              <p className="text-gray-400">
                Empowering traditional medicine startups with modern technology and comprehensive support.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center">
                  <FaPhone className="mr-2" />
                  <span>+91 11 1234 5678</span>
                </div>
                <div className="flex items-center">
                  <FaEnvelope className="mr-2" />
                  <span>info@ayushportal.gov.in</span>
                </div>
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2" />
                  <span>New Delhi, India</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AYUSH Startup Registration Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

