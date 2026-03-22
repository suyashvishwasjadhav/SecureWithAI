import { Shield, Github, Twitter, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Footer = () => {
  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Scanner', href: '#' },
        { name: 'CLI Tool', href: '#' },
        { name: 'API', href: '#' },
        { name: 'Docs', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '/about' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Blog', href: '#' },
        { name: 'Careers', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms', href: '#' },
        { name: 'Security', href: '#' },
      ],
    },
  ];

  const socialLinks = [
    { name: 'GitHub', icon: Github, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
  ];

  return (
    <footer className="border-t border-border bg-bg pt-24 pb-12 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      
      <div className="max-w-[1280px] mx-auto px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <Shield className="w-6 h-6 text-accent" fill="currentColor" fillOpacity={0.1} />
              <span className="font-head font-semibold text-lg tracking-tight text-white">
                Shield<span className="text-accent text-opacity-80">Sentinel</span>
              </span>
            </Link>
            <p className="text-muted text-sm leading-relaxed max-w-[200px]">
              The next-generation security platform for developers who take identity and threats seriously.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  whileHover={{ scale: 1.2, color: '#6366f1' }}
                  className="p-2 rounded-lg bg-surface border border-border text-muted transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title} className="flex flex-col gap-6">
              <h4 className="text-white font-head font-semibold text-sm tracking-wide uppercase opacity-90">
                {group.title}
              </h4>
              <ul className="flex flex-col gap-4">
                {group.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-muted text-sm transition-colors hover:text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-dim text-xs font-medium">
            © {new Date().getFullYear()} ShieldSentinel. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-dim text-xs font-semibold uppercase tracking-widest">
            Made for developers who take security <span className="text-accent/60">seriously.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
