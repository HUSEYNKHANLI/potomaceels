import { useState } from "react";
import { Link } from "wouter";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-primary text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <a className="playfair text-2xl font-bold mr-2">
              <span className="text-accent">Potomac</span> Eels
            </a>
          </Link>
        </div>
        <div className="hidden md:flex space-x-6 items-center">
          <a href="#" className="hover:text-accent-light transition">Menu</a>
          <a href="#" className="hover:text-accent-light transition">About</a>
          <a href="#" className="hover:text-accent-light transition">Contact</a>
          <button className="bg-secondary hover:bg-secondary-light px-4 py-2 rounded-md transition">
            Login
          </button>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-white focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} bg-primary-light px-4 py-3`}>
        <a href="#" className="block py-2 hover:text-accent-light transition">Menu</a>
        <a href="#" className="block py-2 hover:text-accent-light transition">About</a>
        <a href="#" className="block py-2 hover:text-accent-light transition">Contact</a>
        <button className="mt-2 w-full bg-secondary hover:bg-secondary-light px-4 py-2 rounded-md transition">
          Login
        </button>
      </div>
    </nav>
  );
}
