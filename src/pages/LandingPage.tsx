import { useNavigate } from "react-router-dom";
import { MdArrowRight } from "react-icons/md";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=1600')",
      }}
    >
      {/* Overlay */}
      <div className="min-h-screen bg-slate-900/80 px-8 py-10 flex flex-col justify-between">

        {/* Top */}
        <div className="mt-12">
          <h1 className="text-3xl font-black tracking-widest text-white">
            AMPL
          </h1>
          <div className="h-1 w-10 bg-blue-600 mt-2" />
        </div>

        {/* Middle */}
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Driver Duty
            <br />
            Management
          </h2>

          <p className="text-slate-300 mt-4 text-base md:text-lg leading-relaxed">
            Secure enterprise fleet coordination and real-time task tracking
            for AMPL professionals.
          </p>
        </div>

        {/* Bottom */}
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-600 hover:bg-blue-700 transition h-14 md:h-16 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-lg mb-10"
        >
          Get Started
          <MdArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
