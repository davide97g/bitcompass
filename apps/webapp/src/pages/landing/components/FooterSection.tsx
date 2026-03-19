import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import logoSvg from "@/logo.svg";

export function FooterSection() {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-4xl mx-auto text-center">
        <img src={logoSvg} alt="BitCompass" className="w-10 h-10 rounded-lg mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-3">
          Ready to share rules with your team?
        </h3>
        <p className="text-gray-400 mb-8">
          Get started in under a minute. Free for small teams.
        </p>
        <div className="flex items-center justify-center gap-4 mb-12">
          <Link
            to="/login"
            className="px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-[#7fdbca] to-[#c792ea] hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/davide97g/bitcompass"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors inline-flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
        <div className="flex items-center justify-center gap-6 text-gray-600 text-sm">
          <span>&copy; {new Date().getFullYear()} BitCompass</span>
          <span className="text-gray-700">·</span>
          <span className="flex items-center gap-1.5">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/davide-ghiotto/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              Davide Ghiotto
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          </span>
          <span className="text-gray-700">·</span>
          <a
            href="https://viteplus.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            Built with
            <img
              src="https://viteplus.dev/icon.svg"
              alt="Vite+"
              className="w-4 h-4"
            />
            <span>Vite+</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
