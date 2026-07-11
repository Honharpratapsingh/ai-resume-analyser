import { Link } from "react-router";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/">
        <p className="text-2xl font-bold text-gradient">RESUMIND</p>
      </Link>

      <div className="flex items-center gap-4">
        <Link
          to="/wipe"
          className="text-xs text-gray-400 hover:text-red-400 transition-colors duration-200"
        >
          Wipe Data
        </Link>

        <Link to="/upload" className="primary-button w-fit">
          Upload Resume
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;