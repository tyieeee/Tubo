import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white border-2 border-gray-200 rounded-[3rem] px-6 py-4 shadow-lg mb-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Image 
                src="/img/logo.png" 
                alt="Tubo Logo" 
                width={150} 
                height={45}
                className="h-10 w-auto"
              />
            </div>
            
            {/* Hamburger Menu Button */}
            <button className="bg-transparent rounded-3xl p-3 hover:bg-gray-50">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4">
        <div className="text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Send invoices once. Follow every delivery attempt.
          </h1>
          <p className="text-xl text-gray-900 mb-8 leading-relaxed">
            Send your invoices to Tubo and we deliver them to the government for you.
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-[2rem] hover:bg-gray-900 hover:text-white hover:scale-105 hover:shadow-xl font-medium text-lg transition-all duration-300"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
